package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
	"spanel/internal/ai"
	"spanel/internal/builder"
	"spanel/internal/config"
	"spanel/internal/crypto"
	"spanel/internal/db"
)

func isPortInUse(port int) bool {
	ln, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return true
	}
	_ = ln.Close()
	return false
}

func getAvailablePort(preferredPort int) int {
	if preferredPort <= 0 {
		preferredPort = 3000
	}
	if !isPortInUse(preferredPort) {
		return preferredPort
	}
	for p := preferredPort + 1; p < 65535; p++ {
		if !isPortInUse(p) {
			return p
		}
	}
	return preferredPort
}

var projectMutexes sync.Map

func getProjectMutex(projectID string) *sync.Mutex {
	v, _ := projectMutexes.LoadOrStore(projectID, &sync.Mutex{})
	return v.(*sync.Mutex)
}

type DeployService struct {
	db      *gorm.DB
	aiAgent *ai.AIAgent
	cfg     *config.Config
}

func NewDeployService(database *gorm.DB, aiAgent *ai.AIAgent, cfg *config.Config) *DeployService {
	return &DeployService{
		db:      database,
		aiAgent: aiAgent,
		cfg:     cfg,
	}
}

func (s *DeployService) HandleDeploy(ctx context.Context, job *db.InternalQueueJob) error {
	var deployment db.Deployment
	if err := s.db.First(&deployment, "id = ?", job.TargetID).Error; err != nil {
		return fmt.Errorf("deployment %s not found: %w", job.TargetID, err)
	}

	var project db.Project
	if err := s.db.First(&project, "id = ?", deployment.ProjectID).Error; err != nil {
		return fmt.Errorf("project %s not found: %w", deployment.ProjectID, err)
	}

	mu := getProjectMutex(project.ID)
	mu.Lock()
	defer mu.Unlock()

	s.db.Model(&deployment).Update("status", "building")

	sourceDir := filepath.Join(".", "data", "repos", project.Name)
	_ = os.MkdirAll(filepath.Dir(sourceDir), 0755)
	logsDir := filepath.Join(".", "data", "logs")
	_ = os.MkdirAll(logsDir, 0755)
	logFilePath := filepath.Join(logsDir, fmt.Sprintf("%s.log", deployment.ID))
	logFile, _ := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	defer logFile.Close()

	writeLog := func(format string, a ...interface{}) {
		msg := fmt.Sprintf(format, a...)
		if !strings.HasSuffix(msg, "\n") {
			msg += "\n"
		}
		_, _ = logFile.WriteString(msg)
		log.Print(msg)
	}

	writeLog("=== [sPanel Engine Deployment Triggered] ===")
	writeLog("Project: %s | Repo: %s | Branch: %s", project.Name, project.RepoFullName, project.Branch)

	var gitToken string
	var ghAcc db.GitHubAccount
	if err := s.db.First(&ghAcc, "user_id = ?", project.UserID).Error; err == nil {
		if decrypted, dErr := crypto.Decrypt(ghAcc.TokenEncrypted, s.cfg.MasterKey, "gh:"+ghAcc.UserID); dErr == nil && decrypted != "" {
			gitToken = decrypted
		}
	} else if err := s.db.First(&ghAcc).Error; err == nil {
		if decrypted, dErr := crypto.Decrypt(ghAcc.TokenEncrypted, s.cfg.MasterKey, "gh:"+ghAcc.UserID); dErr == nil && decrypted != "" {
			gitToken = decrypted
		}
	}

	repoURL := fmt.Sprintf("https://github.com/%s.git", project.RepoFullName)

	gitDir := filepath.Join(sourceDir, ".git")

	gitArgs := func(baseArgs ...string) []string {
		if gitToken == "" {
			return baseArgs
		}
		authHeader := "Authorization: Basic " + base64.StdEncoding.EncodeToString([]byte("x-access-token:"+gitToken))
		return append([]string{"-c", "credential.helper=", "-c", "http.extraHeader=" + authHeader}, baseArgs...)
	}

	runCmdStreaming := func(cmd *exec.Cmd) error {
		cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0", "GIT_ASKPASS=/bin/false")
		cmd.Stdin = strings.NewReader("")
		stdout, _ := cmd.StdoutPipe()
		stderr, _ := cmd.StderrPipe()

		if err := cmd.Start(); err != nil {
			return err
		}

		var wg sync.WaitGroup
		wg.Add(2)

		streamFunc := func(r io.Reader) {
			defer wg.Done()
			scanner := bufio.NewScanner(r)
			scanner.Split(func(data []byte, atEOF bool) (advance int, token []byte, err error) {
				if atEOF && len(data) == 0 {
					return 0, nil, nil
				}
				if i := bytes.IndexAny(data, "\r\n"); i >= 0 {
					return i + 1, data[0:i], nil
				}
				if atEOF {
					return len(data), data, nil
				}
				return 0, nil, nil
			})
			for scanner.Scan() {
				text := strings.TrimSpace(scanner.Text())
				if text != "" {
					writeLog("%s", text)
				}
			}
			if err := scanner.Err(); err != nil {
				writeLog("[STREAM ERROR] %v", err)
			}
		}

		go streamFunc(stdout)
		go streamFunc(stderr)

		wg.Wait()
		return cmd.Wait()
	}

	writeLog("Cloning repository %s ...", project.RepoFullName)
	_ = os.RemoveAll(sourceDir)

	var cloneErr error
	if gitToken != "" {
		cmd := exec.CommandContext(ctx, "git", gitArgs("clone", "--progress", "--depth", "1", "--branch", project.Branch, repoURL, sourceDir)...)
		cloneErr = runCmdStreaming(cmd)
		if cloneErr != nil {
			writeLog("Clone with token failed or branch %s not found, checking fallback...", project.Branch)
			_ = os.RemoveAll(sourceDir)
		}
	}

	if gitToken == "" || cloneErr != nil {
		cmd := exec.CommandContext(ctx, "git", "clone", "--progress", "--depth", "1", "--branch", project.Branch, repoURL, sourceDir)
		if err := runCmdStreaming(cmd); err != nil {
			writeLog("Branch %s not found, retrying default branch...", project.Branch)
			_ = os.RemoveAll(sourceDir)
			cmdFallback := exec.CommandContext(ctx, "git", "clone", "--progress", "--depth", "1", repoURL, sourceDir)
			if fbErr := runCmdStreaming(cmdFallback); fbErr != nil {
				writeLog("❌ Git clone failed: %v", fbErr)
				deployment.Status = "failed"
				s.db.Save(&deployment)
				return fmt.Errorf("git clone failed: %w", fbErr)
			}
		}
	}
	writeLog("✓ Repository cloned successfully!")

	_ = os.RemoveAll(gitDir)

	writeLog("Checking Docker Engine daemon...")
	checkDocker := exec.CommandContext(ctx, "docker", "info")
	if err := checkDocker.Run(); err != nil {
		writeLog("\n❌ DOCKER ENGINE TIDAK AKTIF!")
		writeLog("Docker Desktop di Windows lu saat ini belum dibuka / belum berjalan.")
		writeLog("👉 Silakan buka aplikasi Docker Desktop di laptop lu, lalu klik 'Deploy Now' lagi.")
		deployment.Status = "failed"
		s.db.Save(&deployment)
		return fmt.Errorf("docker engine is not running: %w", err)
	}
	writeLog("✓ Docker Engine active!")

	EnsureTraefikRunning(ctx, writeLog)

	imageTag := fmt.Sprintf("spanel-%s:%s", project.Name, deployment.ID[:8])
	buildOpts := &builder.BuildOptions{
		DeploymentID: deployment.ID,
		ProjectID:    project.ID,
		ProjectName:  project.Name,
		SourceDir:    sourceDir,
		ImageTag:     imageTag,
		EnvVars:      make(map[string]string),
		LogWriter:    logFile,
	}

	var envs []db.EnvironmentVariable
	s.db.Where("project_id = ?", project.ID).Find(&envs)
	envMap := make(map[string]string)
	for _, e := range envs {
		val, err := crypto.Decrypt(e.ValueEncrypted, s.cfg.MasterKey, "env:"+e.ProjectID+":"+e.Key)
		if err == nil {
			buildOpts.EnvVars[e.Key] = val
			envMap[e.Key] = val
		}
	}

	writeLog("Launching Ephemeral Nixpacks Container Builder...")
	buildRes, err := builder.BuildWithNixpacksEphemeral(ctx, buildOpts)
	now := time.Now()
	deployment.FinishedAt = &now
	if buildRes != nil {
		deployment.LogFilePath = buildRes.LogPath
	}

	if err != nil {
		deployment.Status = "failed"
		s.db.Save(&deployment)
		writeLog("\n❌ Build failed. Triggering AI DevOps Diagnostics...")

		var knownSecrets []string
		if gitToken != "" {
			knownSecrets = append(knownSecrets, gitToken)
		}
		for _, v := range envMap {
			knownSecrets = append(knownSecrets, v)
		}

		logCtx, extErr := ai.ExtractLogContext(buildRes.LogPath, knownSecrets)
		if extErr == nil && deployment.RetryCount < 3 {
			aiKey := os.Getenv("SPANEL_AI_API_KEY")
			aiProvider := os.Getenv("SPANEL_AI_PROVIDER")
			if aiProvider == "" {
				aiProvider = "gemini"
			}

			var savedProv db.AIProvider
			if err := s.db.First(&savedProv, "user_id = ?", "default-admin").Error; err == nil && savedProv.APIKeyEncrypted != "" {
				if decKey, decErr := crypto.Decrypt(savedProv.APIKeyEncrypted, s.cfg.MasterKey, "ai:default-admin"); decErr == nil && decKey != "" {
					aiKey = decKey
					aiProvider = savedProv.ProviderName
				}
			}

			if aiKey != "" {
				plan, diagErr := s.aiAgent.DiagnoseAndRemediate(ctx, aiProvider, aiKey, deployment.RetryCount, logCtx)
				if diagErr == nil && plan != nil {
					remediation := db.AIRemediation{
						DeploymentID:  deployment.ID,
						ErrorCategory: plan.ErrorCategory,
						AIAnalysis:    plan.Analysis,
						IsApplied:     false,
					}
					s.db.Create(&remediation)
					writeLog("[AI AGENT] %s: %s", plan.ErrorCategory, plan.Analysis)
				}
			}
		}
		return err
	}

	hostPort := project.TargetPort
	if hostPort <= 0 {
		hostPort = 3000
	}
	if isPortInUse(hostPort) {
		newPort := getAvailablePort(hostPort)
		writeLog("⚠️ Port %d is already in use on host. Automatically allocated available port %d", hostPort, newPort)
		hostPort = newPort
		project.TargetPort = hostPort
		s.db.Model(&project).Update("target_port", hostPort)
	}

	containerPort := 3000
	if pStr, ok := envMap["PORT"]; ok {
		if pVal, err := strconv.Atoi(pStr); err == nil && pVal > 0 {
			containerPort = pVal
		}
	}

	containerName := fmt.Sprintf("spanel-app-%s", project.Name)
	writeLog("Launching container %s on host port %d (internal: %d)...", containerName, hostPort, containerPort)

	_ = exec.CommandContext(ctx, "docker", "rm", "-f", containerName).Run()

	_ = exec.CommandContext(ctx, "docker", "network", "create", "spanel-net").Run()
	spaDir := "dist"
	if customSpa, ok := envMap["NIXPACKS_SPA_OUTPUT_DIR"]; ok {
		spaDir = customSpa
	}

	runArgs := []string{
		"run", "-d",
		"--name", containerName,
		"--network", "spanel-net",
		"--restart", "unless-stopped",
		"--memory", fmt.Sprintf("%dm", project.MemoryLimitMB),
		"--memory-swap", fmt.Sprintf("%dm", project.MemoryLimitMB),
		"--cpus", fmt.Sprintf("%.2f", project.CPULimit),
		"--pids-limit", "512",
		"--security-opt", "no-new-privileges",
		"--cap-drop", "ALL", 
		"--cap-add", "NET_BIND_SERVICE",
		"-e", fmt.Sprintf("PORT=%d", containerPort),
		"-e", fmt.Sprintf("NIXPACKS_SPA_OUTPUT_DIR=%s", spaDir),
		"-p", fmt.Sprintf("%d:%d", hostPort, containerPort),
		"--label", "traefik.enable=true",
		"--label", "traefik.docker.network=spanel-net",
	}

	traefikRule := fmt.Sprintf("Host(`%s`)", project.MagicDomain)
	if project.CustomDomain != "" {
		traefikRule = fmt.Sprintf("Host(`%s`) || %s", project.CustomDomain, traefikRule)
	}
	runArgs = append(runArgs, 
		"--label", fmt.Sprintf("traefik.http.routers.%s.rule=%s", project.Name, traefikRule),
		"--label", fmt.Sprintf("traefik.http.routers.%s.tls.certresolver=letsencrypt", project.Name),
		"--label", fmt.Sprintf("traefik.http.services.%s.loadbalancer.server.port=%d", project.Name, containerPort),
	)

	envFile, err := os.CreateTemp("", "spanel-env-*")
	if err == nil {
		_ = envFile.Chmod(0600)
		for k, v := range envMap {
			if !strings.Contains(k, "\n") && !strings.Contains(v, "\n") {
				fmt.Fprintf(envFile, "%s=%s\n", k, v)
			}
		}
		envFile.Close()
		defer os.Remove(envFile.Name())
		runArgs = append(runArgs, "--env-file", envFile.Name())
	}

	var volumes []db.Volume
	s.db.Where("project_id = ?", project.ID).Find(&volumes)
	for _, vol := range volumes {
		runArgs = append(runArgs, "-v", fmt.Sprintf("%s:%s", vol.HostPath, vol.ContainerPath))
	}

	runArgs = append(runArgs, buildRes.ImageTag)

	runCmd := exec.CommandContext(ctx, "docker", runArgs...)
	if runOut, runErr := runCmd.CombinedOutput(); runErr != nil {
		writeLog("❌ Failed to launch container: %v\nOutput: %s", runErr, string(runOut))
		deployment.Status = "failed"
		s.db.Save(&deployment)
		return runErr
	}

	deployment.Status = "healthy"
	deployment.ImageHash = buildRes.ImageTag
	s.db.Save(&deployment)
	s.db.Model(&project).Update("status", "running")

	// Auto-configure host Nginx reverse proxy if host has Nginx (e.g. aaPanel or standard Linux Nginx)
	nginxVhostDirs := []string{"/www/server/panel/vhost/nginx", "/etc/nginx/conf.d", "/etc/nginx/sites-enabled"}
	for _, dir := range nginxVhostDirs {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			domains := []string{project.MagicDomain}
			if project.CustomDomain != "" {
				domains = append(domains, project.CustomDomain)
			}
			confContent := fmt.Sprintf(`server {
    listen 80;
    server_name %s;

    location / {
        proxy_pass http://127.0.0.1:%d;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
`, strings.Join(domains, " "), hostPort)
			confPath := filepath.Join(dir, fmt.Sprintf("spanel-%s.conf", project.Name))
			if err := os.WriteFile(confPath, []byte(confContent), 0644); err == nil {
				_ = exec.Command("/www/server/nginx/sbin/nginx", "-s", "reload").Run()
				_ = exec.Command("nginx", "-s", "reload").Run()
				writeLog("✓ Configured host Nginx reverse proxy for %s", strings.Join(domains, " "))
			}
			break
		}
	}

	writeLog("\n🎉 DEPLOYMENT SUCCEEDED AND LIVE!")
	writeLog("👉 Magic Domain: http://%s", project.MagicDomain)
	writeLog("👉 Direct Port: http://localhost:%d", project.TargetPort)

	return nil
}

func (s *DeployService) HandleRollback(ctx context.Context, job *db.InternalQueueJob) error {
	var deployment db.Deployment
	if err := s.db.First(&deployment, "id = ?", job.TargetID).Error; err != nil {
		return fmt.Errorf("rollback deployment %s not found: %w", job.TargetID, err)
	}

	var project db.Project
	if err := s.db.First(&project, "id = ?", deployment.ProjectID).Error; err != nil {
		deployment.Status = "failed"
		s.db.Save(&deployment)
		return fmt.Errorf("project %s not found: %w", deployment.ProjectID, err)
	}

	mu := getProjectMutex(project.ID)
	mu.Lock()
	defer mu.Unlock()

	s.db.Model(&deployment).Update("status", "building")

	logsDir := filepath.Join(".", "data", "logs")
	_ = os.MkdirAll(logsDir, 0755)
	logFilePath := filepath.Join(logsDir, fmt.Sprintf("%s.log", deployment.ID))
	logFile, _ := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if logFile != nil {
		defer logFile.Close()
	}

	writeLog := func(format string, a ...interface{}) {
		msg := fmt.Sprintf(format, a...)
		if !strings.HasSuffix(msg, "\n") {
			msg += "\n"
		}
		if logFile != nil {
			_, _ = logFile.WriteString(msg)
		}
		log.Print(msg)
	}

	writeLog("=== [sPanel Engine Rollback Triggered] ===")
	writeLog("Project: %s | Target Image: %s", project.Name, deployment.ImageHash)

	if deployment.ImageHash == "" {
		writeLog("❌ Rollback failed: no valid target Docker image hash specified.")
		deployment.Status = "failed"
		s.db.Save(&deployment)
		return fmt.Errorf("target image hash is empty for rollback deployment %s", deployment.ID)
	}

	writeLog("Verifying Docker image availability: %s ...", deployment.ImageHash)
	checkImg := exec.CommandContext(ctx, "docker", "image", "inspect", deployment.ImageHash)
	if err := checkImg.Run(); err != nil {
		writeLog("❌ Rollback failed: target image '%s' no longer exists in local Docker cache (may have been pruned).", deployment.ImageHash)
		deployment.Status = "failed"
		s.db.Save(&deployment)
		return fmt.Errorf("docker image %s does not exist on host: %w", deployment.ImageHash, err)
	}
	writeLog("✓ Docker image verified!")

	var envs []db.EnvironmentVariable
	s.db.Where("project_id = ?", project.ID).Find(&envs)
	envMap := make(map[string]string)
	for _, e := range envs {
		val, err := crypto.Decrypt(e.ValueEncrypted, s.cfg.MasterKey, "env:"+e.ProjectID+":"+e.Key)
		if err == nil {
			envMap[e.Key] = val
		}
	}

	hostPort := project.TargetPort
	if hostPort <= 0 {
		hostPort = 3000
	}
	containerPort := 3000
	if pStr, ok := envMap["PORT"]; ok {
		if pVal, err := strconv.Atoi(pStr); err == nil && pVal > 0 {
			containerPort = pVal
		}
	}

	containerName := fmt.Sprintf("spanel-app-%s", project.Name)
	writeLog("Stopping current container %s and switching to rollback image...", containerName)
	_ = exec.CommandContext(ctx, "docker", "rm", "-f", containerName).Run()
	_ = exec.CommandContext(ctx, "docker", "network", "create", "spanel-net").Run()

	spaDir := "dist"
	if customSpa, ok := envMap["NIXPACKS_SPA_OUTPUT_DIR"]; ok {
		spaDir = customSpa
	}

	runArgs := []string{
		"run", "-d",
		"--name", containerName,
		"--network", "spanel-net",
		"--restart", "unless-stopped",
		"--memory", fmt.Sprintf("%dm", project.MemoryLimitMB),
		"--memory-swap", fmt.Sprintf("%dm", project.MemoryLimitMB),
		"--cpus", fmt.Sprintf("%.2f", project.CPULimit),
		"--pids-limit", "512",
		"--security-opt", "no-new-privileges",
		"--cap-drop", "ALL",
		"--cap-add", "NET_BIND_SERVICE",
		"-e", fmt.Sprintf("PORT=%d", containerPort),
		"-e", fmt.Sprintf("NIXPACKS_SPA_OUTPUT_DIR=%s", spaDir),
		"-p", fmt.Sprintf("%d:%d", hostPort, containerPort),
		"--label", "traefik.enable=true",
		"--label", "traefik.docker.network=spanel-net",
	}

	traefikRule := fmt.Sprintf("Host(`%s`)", project.MagicDomain)
	if project.CustomDomain != "" {
		traefikRule = fmt.Sprintf("Host(`%s`) || %s", project.CustomDomain, traefikRule)
	}
	runArgs = append(runArgs,
		"--label", fmt.Sprintf("traefik.http.routers.%s.rule=%s", project.Name, traefikRule),
		"--label", fmt.Sprintf("traefik.http.routers.%s.tls.certresolver=letsencrypt", project.Name),
		"--label", fmt.Sprintf("traefik.http.services.%s.loadbalancer.server.port=%d", project.Name, containerPort),
	)

	envFile, err := os.CreateTemp("", "spanel-env-rollback-*")
	if err == nil {
		_ = envFile.Chmod(0600)
		for k, v := range envMap {
			if !strings.Contains(k, "\n") && !strings.Contains(v, "\n") {
				fmt.Fprintf(envFile, "%s=%s\n", k, v)
			}
		}
		envFile.Close()
		defer os.Remove(envFile.Name())
		runArgs = append(runArgs, "--env-file", envFile.Name())
	}

	var volumes []db.Volume
	s.db.Where("project_id = ?", project.ID).Find(&volumes)
	for _, vol := range volumes {
		runArgs = append(runArgs, "-v", fmt.Sprintf("%s:%s", vol.HostPath, vol.ContainerPath))
	}

	runArgs = append(runArgs, deployment.ImageHash)

	runCmd := exec.CommandContext(ctx, "docker", runArgs...)
	if runOut, runErr := runCmd.CombinedOutput(); runErr != nil {
		writeLog("❌ Failed to launch rollback container: %v\nOutput: %s", runErr, string(runOut))
		deployment.Status = "failed"
		s.db.Save(&deployment)
		return runErr
	}

	now := time.Now()
	deployment.FinishedAt = &now
	deployment.Status = "healthy"
	s.db.Save(&deployment)
	s.db.Model(&project).Update("status", "running")

	writeLog("\n🎉 ROLLBACK SUCCEEDED AND LIVE!")
	writeLog("👉 Restored container running image: %s", deployment.ImageHash)
	return nil
}
