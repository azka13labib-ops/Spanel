package service

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"
	"spanel/internal/ai"
	"spanel/internal/builder"
	"spanel/internal/config"
	"spanel/internal/crypto"
	"spanel/internal/db"
)

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

// HandleDeploy executes the complete pipeline: Git clone/pull -> Docker verify -> Nixpacks build -> Container spin-up -> Traefik routing
func (s *DeployService) HandleDeploy(ctx context.Context, job *db.InternalQueueJob) error {
	var deployment db.Deployment
	if err := s.db.First(&deployment, "id = ?", job.TargetID).Error; err != nil {
		return fmt.Errorf("deployment %s not found: %w", job.TargetID, err)
	}

	var project db.Project
	if err := s.db.First(&project, "id = ?", deployment.ProjectID).Error; err != nil {
		return fmt.Errorf("project %s not found: %w", deployment.ProjectID, err)
	}

	// Update deployment status to building
	s.db.Model(&deployment).Update("status", "building")

	// Source directory (local git clone cache)
	sourceDir := filepath.Join(".", "data", "repos", project.Name)
	_ = os.MkdirAll(filepath.Dir(sourceDir), 0755)

	// Setup log file early
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

	// 1. Git Clone or Pull with GitHub Token Support
	var gitToken string
	var ghAcc db.GitHubAccount
	if err := s.db.First(&ghAcc, "user_id = ?", project.UserID).Error; err == nil {
		if decrypted, dErr := crypto.Decrypt(ghAcc.TokenEncrypted, s.cfg.MasterKey); dErr == nil && decrypted != "" {
			gitToken = decrypted
		}
	} else if err := s.db.First(&ghAcc).Error; err == nil {
		if decrypted, dErr := crypto.Decrypt(ghAcc.TokenEncrypted, s.cfg.MasterKey); dErr == nil && decrypted != "" {
			gitToken = decrypted
		}
	}

	repoURL := fmt.Sprintf("https://github.com/%s.git", project.RepoFullName)
	cloneURL := repoURL
	if gitToken != "" {
		cloneURL = fmt.Sprintf("https://%s@github.com/%s.git", gitToken, project.RepoFullName)
		writeLog("Using authenticated GitHub session for repository access (supports private repos)")
	}

	gitDir := filepath.Join(sourceDir, ".git")

	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		writeLog("Cloning repository %s ...", project.RepoFullName)
		_ = os.RemoveAll(sourceDir)
		cmd := exec.CommandContext(ctx, "git", "clone", "--depth", "1", "--branch", project.Branch, cloneURL, sourceDir)
		cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
		if _, err := cmd.CombinedOutput(); err != nil {
			// Retry without branch flag in case branch name differs
			writeLog("Branch %s not found, retrying default branch...", project.Branch)
			cmdFallback := exec.CommandContext(ctx, "git", "clone", "--depth", "1", cloneURL, sourceDir)
			cmdFallback.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
			if fbOut2, fbErr := cmdFallback.CombinedOutput(); fbErr != nil {
				cleanedOut := string(fbOut2)
				if gitToken != "" {
					cleanedOut = strings.ReplaceAll(cleanedOut, gitToken, "***")
				}
				writeLog("❌ Git clone failed: %v\nOutput: %s", fbErr, cleanedOut)
				deployment.Status = "failed"
				s.db.Save(&deployment)
				return fmt.Errorf("git clone failed: %w", fbErr)
			}
		}
		writeLog("✓ Repository cloned successfully!")
	} else {
		writeLog("Pulling latest commits from repository...")
		if gitToken != "" {
			_ = exec.CommandContext(ctx, "git", "-C", sourceDir, "remote", "set-url", "origin", cloneURL).Run()
		}
		cmd := exec.CommandContext(ctx, "git", "-C", sourceDir, "pull")
		cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
		out, _ := cmd.CombinedOutput()
		cleanedOut := string(out)
		if gitToken != "" {
			cleanedOut = strings.ReplaceAll(cleanedOut, gitToken, "***")
		}
		writeLog("%s", cleanedOut)
	}

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
		val, err := crypto.Decrypt(e.ValueEncrypted, s.cfg.MasterKey)
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

		// Smart Context Extractor & AI Diagnosis
		logCtx, extErr := ai.ExtractLogContext(buildRes.LogPath)
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

	// 5. Spin Up Application Container with Traefik Labels & Port Mapping
	containerName := fmt.Sprintf("spanel-app-%s", project.Name)
	writeLog("Launching container %s on port %d...", containerName, project.TargetPort)

	// Stop old container if exists
	_ = exec.CommandContext(ctx, "docker", "rm", "-f", containerName).Run()

	// Run container with Traefik routing + direct port mapping fallback
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
		"--label", fmt.Sprintf("traefik.http.routers.%s.rule=Host(`%s`)", project.Name, project.MagicDomain),
		"--label", fmt.Sprintf("traefik.http.services.%s.loadbalancer.server.port=%d", project.Name, project.TargetPort),
	}

	for k, v := range envMap {
		runArgs = append(runArgs, "-e", fmt.Sprintf("%s=%s", k, v))
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
