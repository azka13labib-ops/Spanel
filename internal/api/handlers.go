package api

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	fiber "github.com/gofiber/fiber/v2"
	websocket "github.com/gofiber/websocket/v2"
	"spanel/internal/crypto"
	"spanel/internal/db"
)

// Health
func (s *Server) handleHealth(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":    "healthy",
		"service":   "spanel-server",
		"version":   "1.0.0",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// System Metrics
func (s *Server) handleSystemMetrics(c *fiber.Ctx) error {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	return c.JSON(fiber.Map{
		"os":          runtime.GOOS,
		"arch":        runtime.GOARCH,
		"num_cpu":     runtime.NumCPU(),
		"alloc_mb":    mem.Alloc / 1024 / 1024,
		"total_mb":    mem.TotalAlloc / 1024 / 1024,
		"sys_mb":      mem.Sys / 1024 / 1024,
		"goroutines":  runtime.NumGoroutine(),
		"host_ip":     s.cfg.HostIP,
	})
}

// Projects
func (s *Server) handleListProjects(c *fiber.Ctx) error {
	var projects []db.Project
	if err := s.db.Preload("Deployments").Preload("EnvVars").Find(&projects).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(projects)
}

type CreateProjectInput struct {
	Name            string  `json:"name"`
	RepoFullName    string  `json:"repo_fullname"`
	Branch          string  `json:"branch"`
	CustomDomain    string  `json:"custom_domain"`
	TargetPort      int     `json:"target_port"`
	HealthcheckPath string  `json:"healthcheck_path"`
	MemoryLimitMB   int     `json:"memory_limit_mb"`
	CPULimit        float64 `json:"cpu_limit"`
	AIMode          string  `json:"ai_mode"`
}

func (s *Server) handleCreateProject(c *fiber.Ctx) error {
	var input CreateProjectInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	if input.Name == "" || input.RepoFullName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name and repo_fullname are required"})
	}

	// Sanitize repo full name if user entered full URL
	repo := strings.TrimSpace(input.RepoFullName)
	repo = strings.TrimPrefix(repo, "https://github.com/")
	repo = strings.TrimPrefix(repo, "http://github.com/")
	repo = strings.TrimPrefix(repo, "git@github.com:")
	repo = strings.TrimSuffix(repo, ".git")
	input.RepoFullName = repo

	if input.Branch == "" {
		input.Branch = "main"
	}
	if input.TargetPort == 0 {
		input.TargetPort = 3000
	}
	if input.HealthcheckPath == "" {
		input.HealthcheckPath = "/"
	}
	if input.MemoryLimitMB == 0 {
		input.MemoryLimitMB = 512
	}
	if input.CPULimit == 0 {
		input.CPULimit = 1.0
	}
	if input.AIMode == "" {
		input.AIMode = "supervised"
	}

	// Generate magic domain (e.g., project-name.127.0.0.1.sslip.io)
	magicDomain := fmt.Sprintf("%s.%s.sslip.io", input.Name, s.cfg.HostIP)

	project := db.Project{
		UserID:          "default-admin", // Single-tenant default
		Name:            input.Name,
		RepoFullName:    input.RepoFullName,
		Branch:          input.Branch,
		CustomDomain:    input.CustomDomain,
		MagicDomain:     magicDomain,
		TargetPort:      input.TargetPort,
		HealthcheckPath: input.HealthcheckPath,
		MemoryLimitMB:   input.MemoryLimitMB,
		CPULimit:        input.CPULimit,
		DockerNetwork:   fmt.Sprintf("spanel-net-%s", input.Name),
		AIMode:          input.AIMode,
		Status:          "idle",
	}

	if err := s.db.Create(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Create isolated docker network for this project
	go func() {
		cmd := exec.Command("docker", "network", "create", project.DockerNetwork)
		_ = cmd.Run()
	}()

	return c.Status(fiber.StatusCreated).JSON(project)
}

func (s *Server) handleGetProject(c *fiber.Ctx) error {
	id := c.Params("id")
	var project db.Project
	if err := s.db.Preload("Deployments").Preload("EnvVars").Preload("Volumes").First(&project, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "project not found"})
	}
	return c.JSON(project)
}

func (s *Server) handleTriggerDeploy(c *fiber.Ctx) error {
	id := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "project not found"})
	}

	now := time.Now()
	deployment := db.Deployment{
		ProjectID:     project.ID,
		CommitHash:    "HEAD",
		CommitMessage: "Manual deployment via Dashboard",
		Status:        "queued",
		StartedAt:     &now,
	}

	if err := s.db.Create(&deployment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Enqueue deploy job
	_, err := s.queue.Enqueue("deploy", deployment.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to enqueue deploy job"})
	}

	return c.JSON(fiber.Map{
		"message":       "deployment queued",
		"deployment_id": deployment.ID,
	})
}

func (s *Server) handleTriggerRollback(c *fiber.Ctx) error {
	id := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "project not found"})
	}

	// Find the last healthy deployment with a valid image_hash
	var prevDeployment db.Deployment
	err := s.db.Where("project_id = ? AND status = ? AND image_hash != ''", project.ID, "healthy").
		Order("created_at desc").
		First(&prevDeployment).Error

	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no previous healthy deployment found for rollback"})
	}

	now := time.Now()
	rollbackDeploy := db.Deployment{
		ProjectID:     project.ID,
		CommitHash:    prevDeployment.CommitHash,
		CommitMessage: fmt.Sprintf("Rollback to deployment #%s (Image: %s)", prevDeployment.ID, prevDeployment.ImageHash),
		ImageHash:     prevDeployment.ImageHash,
		Status:        "queued",
		StartedAt:     &now,
	}

	if err := s.db.Create(&rollbackDeploy).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	_, _ = s.queue.Enqueue("rollback", rollbackDeploy.ID)

	return c.JSON(fiber.Map{
		"message":          "rollback queued",
		"deployment_id":    rollbackDeploy.ID,
		"target_image_hash": prevDeployment.ImageHash,
	})
}

type AttachDBInput struct {
	MarketplaceServiceID string `json:"marketplace_service_id"`
}

func (s *Server) handleAttachDatabase(c *fiber.Ctx) error {
	projectID := c.Params("id")
	var input AttachDBInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	var project db.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "project not found"})
	}

	var service db.MarketplaceService
	if err := s.db.First(&service, "id = ?", input.MarketplaceServiceID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "marketplace service not found"})
	}

	// Auto-wire connection string
	// e.g. postgres://user:pass@service-host:5432/dbname
	connURL := fmt.Sprintf("%s://spanel:%s@%s:%d/spanel_db",
		service.ServiceName,
		"generated_pass",
		service.InternalHostname,
		service.InternalPort,
	)

	encConnURL, _ := crypto.Encrypt(connURL, s.cfg.MasterKey)

	envVar := db.EnvironmentVariable{
		ProjectID:        project.ID,
		Key:              "DATABASE_URL",
		ValueEncrypted:   encConnURL,
		IsSystemInjected: true,
	}

	s.db.Where("project_id = ? AND key = ?", project.ID, "DATABASE_URL").Delete(&db.EnvironmentVariable{})
	s.db.Create(&envVar)

	return c.JSON(fiber.Map{
		"message":        "database attached successfully",
		"project_id":     project.ID,
		"injected_key":   "DATABASE_URL",
		"service_name":   service.ServiceName,
	})
}

// Deployments
func (s *Server) handleGetDeployment(c *fiber.Ctx) error {
	id := c.Params("id")
	var deployment db.Deployment
	if err := s.db.Preload("Remediation").First(&deployment, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "deployment not found"})
	}
	return c.JSON(deployment)
}

// Marketplace
func (s *Server) handleListMarketplace(c *fiber.Ctx) error {
	var services []db.MarketplaceService
	if err := s.db.Find(&services).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(services)
}

type InstallMarketplaceInput struct {
	ServiceName string `json:"service_name"` // "postgresql", "mysql", "redis"
}

func (s *Server) handleInstallMarketplaceService(c *fiber.Ctx) error {
	var input InstallMarketplaceInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	port := 5432
	if input.ServiceName == "mysql" {
		port = 3306
	} else if input.ServiceName == "redis" {
		port = 6379
	}

	hostname := fmt.Sprintf("spanel-%s-%d", input.ServiceName, time.Now().Unix()%10000)

	service := db.MarketplaceService{
		UserID:           "default-admin",
		ServiceName:      input.ServiceName,
		InternalHostname: hostname,
		InternalPort:     port,
		Status:           "running",
	}

	if err := s.db.Create(&service).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(service)
}

// Remediation
func (s *Server) handleGetRemediation(c *fiber.Ctx) error {
	id := c.Params("id")
	var rem db.AIRemediation
	if err := s.db.First(&rem, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "remediation not found"})
	}
	return c.JSON(rem)
}

func (s *Server) handleApplyRemediation(c *fiber.Ctx) error {
	id := c.Params("id")
	var rem db.AIRemediation
	if err := s.db.First(&rem, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "remediation not found"})
	}

	rem.IsApplied = true
	s.db.Save(&rem)

	return c.JSON(fiber.Map{
		"message": "remediation marked as applied",
		"id":      rem.ID,
	})
}

// GitHub Integration Handlers
type GitHubConnectInput struct {
	Token string `json:"token"`
}

type GitHubRepoItem struct {
	ID            int64       `json:"id"`
	Name          string      `json:"name"`
	FullName      string      `json:"full_name"`
	Private       bool        `json:"private"`
	HTMLURL       string      `json:"html_url"`
	Description   string      `json:"description"`
	DefaultBranch string      `json:"default_branch"`
	Language      string      `json:"language"`
	UpdatedAt     string      `json:"updated_at"`
	Owner         GitHubOwner `json:"owner"`
}

type GitHubOwner struct {
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
}

func (s *Server) handleGitHubStatus(c *fiber.Ctx) error {
	var acc db.GitHubAccount
	if err := s.db.First(&acc, "user_id = ?", "default-admin").Error; err != nil {
		return c.JSON(fiber.Map{
			"connected": false,
		})
	}

	return c.JSON(fiber.Map{
		"connected":  true,
		"username":   acc.Username,
		"avatar_url": acc.AvatarURL,
	})
}

func (s *Server) handleGitHubConnect(c *fiber.Ctx) error {
	var input GitHubConnectInput
	if err := c.BodyParser(&input); err != nil || strings.TrimSpace(input.Token) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "GitHub Personal Access Token is required"})
	}

	token := strings.TrimSpace(input.Token)

	// Verify token with GitHub API
	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "sPanel-PaaS")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Failed to connect to GitHub API: " + err.Error()})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token GitHub tidak valid atau tidak memiliki izin akses."})
	}

	var ghUser struct {
		Login     string `json:"login"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&ghUser); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse GitHub response"})
	}

	encToken, err := crypto.Encrypt(token, s.cfg.MasterKey)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to encrypt token"})
	}

	// Upsert account
	var acc db.GitHubAccount
	if err := s.db.First(&acc, "user_id = ?", "default-admin").Error; err == nil {
		acc.Username = ghUser.Login
		acc.AvatarURL = ghUser.AvatarURL
		acc.TokenEncrypted = encToken
		s.db.Save(&acc)
	} else {
		acc = db.GitHubAccount{
			UserID:         "default-admin",
			Username:       ghUser.Login,
			AvatarURL:      ghUser.AvatarURL,
			TokenEncrypted: encToken,
		}
		s.db.Create(&acc)
	}

	return c.JSON(fiber.Map{
		"connected":  true,
		"username":   ghUser.Login,
		"avatar_url": ghUser.AvatarURL,
	})
}

func (s *Server) handleGitHubDisconnect(c *fiber.Ctx) error {
	s.db.Where("user_id = ?", "default-admin").Delete(&db.GitHubAccount{})
	return c.JSON(fiber.Map{
		"connected": false,
		"message":   "GitHub account disconnected",
	})
}

func (s *Server) handleGitHubListRepos(c *fiber.Ctx) error {
	var acc db.GitHubAccount
	if err := s.db.First(&acc, "user_id = ?", "default-admin").Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "GitHub belum terhubung. Silakan login / hubungkan GitHub terlebih dahulu."})
	}

	token, err := crypto.Decrypt(acc.TokenEncrypted, s.cfg.MasterKey)
	if err != nil || token == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decrypt GitHub token"})
	}

	// Fetch repos (public and private, up to 100 sorted by updated)
	reqURL := "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member"
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "sPanel-PaaS")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Failed to fetch repositories from GitHub: " + err.Error()})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Status(resp.StatusCode).JSON(fiber.Map{"error": fmt.Sprintf("GitHub API returned status %d", resp.StatusCode)})
	}

	var repos []GitHubRepoItem
	if err := json.NewDecoder(resp.Body).Decode(&repos); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse repositories JSON"})
	}

	return c.JSON(repos)
}

type GitHubBranchItem struct {
	Name      string `json:"name"`
	Protected bool   `json:"protected"`
}

func (s *Server) handleGitHubListBranches(c *fiber.Ctx) error {
	owner := c.Params("owner")
	repo := c.Params("repo")
	if owner == "" || repo == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "owner and repo are required"})
	}

	var acc db.GitHubAccount
	if err := s.db.First(&acc, "user_id = ?", "default-admin").Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "GitHub belum terhubung"})
	}

	token, err := crypto.Decrypt(acc.TokenEncrypted, s.cfg.MasterKey)
	if err != nil || token == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decrypt GitHub token"})
	}

	reqURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/branches?per_page=100", owner, repo)
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "sPanel-PaaS")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Failed to connect to GitHub API: " + err.Error()})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Status(resp.StatusCode).JSON(fiber.Map{"error": fmt.Sprintf("GitHub API returned status %d", resp.StatusCode)})
	}

	var branches []GitHubBranchItem
	if err := json.NewDecoder(resp.Body).Decode(&branches); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse branches JSON"})
	}

	return c.JSON(branches)
}

// WebSockets
func (s *Server) handleLogStreamWebSocket(c *websocket.Conn) {
	deploymentID := c.Params("deploymentId")
	defer c.Close()

	logFilePath := filepath.Join(".", "data", "logs", fmt.Sprintf("%s.log", deploymentID))

	// Tail the file
	file, err := os.Open(logFilePath)
	if err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Log file not found: %s. Waiting for build to start...\n", deploymentID)))
	}

	var reader *bufio.Reader
	if file != nil {
		defer file.Close()
		reader = bufio.NewReader(file)
	}

	for {
		if reader != nil {
			line, err := reader.ReadString('\n')
			if err == nil {
				if err := c.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
					break
				}
				continue
			}
			if err == io.EOF {
				time.Sleep(500 * time.Millisecond)
				continue
			}
		} else {
			// Retry open
			if f, err := os.Open(logFilePath); err == nil {
				file = f
				defer file.Close()
				reader = bufio.NewReader(file)
				continue
			}
			time.Sleep(1 * time.Second)
		}
	}
}

func (s *Server) handleTerminalWebSocket(c *websocket.Conn) {
	containerID := c.Params("containerId")
	defer c.Close()

	_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Connecting to container %s terminal...\r\n", containerID)))

	cmd := exec.Command("docker", "exec", "-it", containerID, "/bin/sh")
	stdin, _ := cmd.StdinPipe()
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Failed to exec terminal: %v\r\n", err)))
		return
	}

	// Output reader to WS
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				_ = c.WriteMessage(websocket.BinaryMessage, buf[:n])
			}
			if err != nil {
				break
			}
		}
	}()

	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stderr.Read(buf)
			if n > 0 {
				_ = c.WriteMessage(websocket.BinaryMessage, buf[:n])
			}
			if err != nil {
				break
			}
		}
	}()

	// WS input to stdin
	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			break
		}
		_, _ = stdin.Write(msg)
	}

	_ = cmd.Process.Kill()
}
