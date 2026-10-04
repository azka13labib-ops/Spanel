package service

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
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

	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		writeLog("Cloning repository %s ...", project.RepoFullName)
		_ = os.RemoveAll(sourceDir)
		cmd := exec.CommandContext(ctx, "git", gitArgs("clone", "--depth", "1", "--branch", project.Branch, repoURL, sourceDir)...)
		cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
		if _, err := cmd.CombinedOutput(); err != nil {
			writeLog("Branch %s not found, retrying default branch...", project.Branch)
			cmdFallback := exec.CommandContext(ctx, "git", gitArgs("clone", "--depth", "1", repoURL, sourceDir)...)
			cmdFallback.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
			if fbOut2, fbErr := cmdFallback.CombinedOutput(); fbErr != nil {
				writeLog("❌ Git clone failed: %v\nOutput: %s", fbErr, string(fbOut2))
				deployment.Status = "failed"
				s.db.Save(&deployment)
				return fmt.Errorf("git clone failed: %w", fbErr)
			}
		}
		writeLog("✓ Repository cloned successfully!")
	} else {
		writeLog("Pulling latest commits from repository...")
		cmd := exec.CommandContext(ctx, "git", gitArgs("-C", sourceDir, "pull")...)
		cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
		out, _ := cmd.CombinedOutput()
		writeLog("%s", string(out))
	}

	// Remove .git directory after clone/pull so PAT doesn't get baked into the Docker image
	_ = os.RemoveAll(gitDir)

	// 2. Check Docker Engine Availability
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

	// 3. Ensure Traefik Reverse Proxy is running on Port 80
	EnsureTraefikRunning(ctx, writeLog)

	// 4. Build with Nixpacks Ephemeral Container
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

	// Fetch and decrypt project env vars
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
	deployment.LogFilePath = buildRes.LogPath

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

		// Smart Context Extractor & AI Diagnosis
		logCtx, extErr := ai.ExtractLogContext(buildRes.LogPath, knownSecrets)
		if extErr == nil && deployment.RetryCount < 3 {
			aiKey := os.Getenv("SPANEL_AI_API_KEY")
			aiProvider := os.Getenv("SPANEL_AI_PROVIDER")
			if aiProvider == "" {
				aiProvider = "gemini"
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

	containerName := fmt.Sprintf("spanel-app-%s", project.Name)
	writeLog("Launching container %s on port %d...", containerName, project.TargetPort)

	_ = exec.CommandContext(ctx, "docker", "rm", "-f", containerName).Run()

	_ = exec.CommandContext(ctx, "docker", "network", "create", "spanel-net").Run()
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
		"-p", fmt.Sprintf("%d:%d", project.TargetPort, project.TargetPort),
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
		"--label", fmt.Sprintf("traefik.http.services.%s.loadbalancer.server.port=%d", project.Name, project.TargetPort),
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

	writeLog("\n🎉 DEPLOYMENT SUCCEEDED AND LIVE!")
	writeLog("👉 Magic Domain: http://%s", project.MagicDomain)
	writeLog("👉 Direct Port: http://localhost:%d", project.TargetPort)

	return nil
}
