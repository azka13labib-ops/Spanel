package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"spanel"
	"spanel/internal/ai"
	"spanel/internal/api"
	"spanel/internal/builder"
	"spanel/internal/config"
	"spanel/internal/crypto"
	"spanel/internal/db"
	"spanel/internal/janitor"
	"spanel/internal/queue"
)

func main() {
	log.Println("==================================================")
	log.Println("🚀 sPanel — Zero-Config AI-Powered Self-Hosted PaaS")
	log.Println("==================================================")

	// 1. Load Configuration
	cfg := config.Load()
	log.Printf("[CONFIG] Data Dir: %s, Port: %s", cfg.DataDir, cfg.Port)

	// 2. Initialize SQLite in WAL mode
	database, err := db.Init(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("[FATAL] Failed to initialize SQLite database: %v", err)
	}

	// 3. Initialize Queue & Worker
	q := queue.NewQueue(database)
	aiAgent := ai.NewAIAgent()

	// Register Deploy Worker Handler
	q.RegisterHandler("deploy", func(ctx context.Context, job *db.InternalQueueJob) error {
		var deployment db.Deployment
		if err := database.First(&deployment, "id = ?", job.TargetID).Error; err != nil {
			return fmt.Errorf("deployment %s not found: %w", job.TargetID, err)
		}

		var project db.Project
		if err := database.First(&project, "id = ?", deployment.ProjectID).Error; err != nil {
			return fmt.Errorf("project %s not found: %w", deployment.ProjectID, err)
		}

		// Update deployment status to building
		database.Model(&deployment).Update("status", "building")

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

		// 1. Git Clone or Pull with GitHub Token Support (for private & public repos)
		var gitToken string
		var ghAcc db.GitHubAccount
		if err := database.First(&ghAcc, "user_id = ?", project.UserID).Error; err == nil {
			if decrypted, dErr := crypto.Decrypt(ghAcc.TokenEncrypted, cfg.MasterKey); dErr == nil && decrypted != "" {
				gitToken = decrypted
			}
		} else if err := database.First(&ghAcc).Error; err == nil {
			// Fallback to any connected github account
			if decrypted, dErr := crypto.Decrypt(ghAcc.TokenEncrypted, cfg.MasterKey); dErr == nil && decrypted != "" {
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
					database.Save(&deployment)
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
			database.Save(&deployment)
			return fmt.Errorf("docker engine is not running: %w", err)
		}
		writeLog("✓ Docker Engine active!")

		// 3. Ensure Traefik Reverse Proxy is running on Port 80
		ensureTraefikRunning(ctx, writeLog)

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

		// Fetch project env vars
		var envs []db.EnvironmentVariable
		database.Where("project_id = ?", project.ID).Find(&envs)
		for _, e := range envs {
			buildOpts.EnvVars[e.Key] = e.Key
		}

		writeLog("Launching Ephemeral Nixpacks Container Builder...")
		buildRes, err := builder.BuildWithNixpacksEphemeral(ctx, buildOpts)
		now := time.Now()
		deployment.FinishedAt = &now
		deployment.LogFilePath = buildRes.LogPath

		if err != nil {
			deployment.Status = "failed"
			database.Save(&deployment)
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
					plan, diagErr := aiAgent.DiagnoseAndRemediate(ctx, aiProvider, aiKey, deployment.RetryCount, logCtx)
					if diagErr == nil && plan != nil {
						remediation := db.AIRemediation{
							DeploymentID:  deployment.ID,
							ErrorCategory: plan.ErrorCategory,
							AIAnalysis:    plan.Analysis,
							IsApplied:     false,
						}
						database.Create(&remediation)
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
			"-p", fmt.Sprintf("%d:%d", project.TargetPort, project.TargetPort),
			"--label", "traefik.enable=true",
			"--label", "traefik.docker.network=spanel-net",
			"--label", fmt.Sprintf("traefik.http.routers.%s.rule=Host(`%s`)", project.Name, project.MagicDomain),
			"--label", fmt.Sprintf("traefik.http.services.%s.loadbalancer.server.port=%d", project.Name, project.TargetPort),
			buildRes.ImageTag,
		}

		runCmd := exec.CommandContext(ctx, "docker", runArgs...)
		if runOut, runErr := runCmd.CombinedOutput(); runErr != nil {
			writeLog("❌ Failed to launch container: %v\nOutput: %s", runErr, string(runOut))
			deployment.Status = "failed"
			database.Save(&deployment)
			return runErr
		}

		// Deployment Succeeded
		deployment.Status = "healthy"
		deployment.ImageHash = buildRes.ImageTag
		database.Save(&deployment)
		database.Model(&project).Update("status", "running")

		writeLog("\n🎉 DEPLOYMENT SUCCEEDED AND LIVE!")
		writeLog("👉 Magic Domain: http://%s", project.MagicDomain)
		writeLog("👉 Direct Port: http://localhost:%d", project.TargetPort)

		return nil
	})

	// Start Queue Worker
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()
	q.Start(workerCtx)

	// 4. Initialize Janitor (3 AM auto-prune)
	cleaner := janitor.NewJanitor(q)
	cleaner.Start()
	defer cleaner.Stop()

	// 5. Initialize Web Server with Embedded Next.js SPA
	embeddedWebFS := spanel.GetWebFS()
	srv := api.NewServer(database, q, cfg, embeddedWebFS)

	// Graceful shutdown handling
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigCh
		log.Println("[PANEL] Gracefully shutting down...")
		workerCancel()
		q.Stop()
		_ = srv.App().Shutdown()
		os.Exit(0)
	}()

	// Start HTTP Server
	if err := srv.Start(cfg.Port); err != nil {
		log.Fatalf("[FATAL] Server terminated: %v", err)
	}
}

// ensureTraefikRunning launches the Traefik container on port 80 to route *.sslip.io domains
func ensureTraefikRunning(ctx context.Context, writeLog func(string, ...interface{})) {
	_ = exec.CommandContext(ctx, "docker", "network", "create", "spanel-net").Run()

	// Check if spanel-traefik is already running
	cmdCheck := exec.CommandContext(ctx, "docker", "ps", "--filter", "name=spanel-traefik", "--format", "{{.Names}}")
	out, err := cmdCheck.CombinedOutput()
	if err == nil && strings.Contains(string(out), "spanel-traefik") {
		_ = exec.CommandContext(ctx, "docker", "network", "connect", "spanel-net", "spanel-traefik").Run()
		writeLog("✓ Traefik reverse proxy is already running on port 80 (network: spanel-net)")
		return
	}

	writeLog("Starting Traefik reverse proxy on port 80...")
	_ = exec.CommandContext(ctx, "docker", "rm", "-f", "spanel-traefik").Run()

	runTraefik := exec.CommandContext(ctx, "docker", "run", "-d",
		"--name", "spanel-traefik",
		"--restart", "always",
		"--network", "spanel-net",
		"-p", "80:80",
		"-v", "/var/run/docker.sock:/var/run/docker.sock",
		"traefik:v3.1",
		"--providers.docker=true",
		"--providers.docker.exposedbydefault=false",
		"--providers.docker.network=spanel-net",
		"--entrypoints.web.address=:80",
	)

	if tOut, tErr := runTraefik.CombinedOutput(); tErr != nil {
		writeLog("[WARNING] Could not start Traefik on port 80: %v (%s). App will still be available on direct port!", tErr, string(tOut))
	} else {
		writeLog("✓ Traefik reverse proxy launched successfully on port 80!")
	}
}
