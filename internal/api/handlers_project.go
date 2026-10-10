package api

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	fiber "github.com/gofiber/fiber/v2"
	"spanel/internal/db"
)

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

type AttachDBInput struct {
	MarketplaceServiceID string `json:"marketplace_service_id"`
}

func (s *Server) handleListProjects(c *fiber.Ctx) error {
	var projects []db.Project
	if err := s.db.Preload("Deployments").Preload("EnvVars").Find(&projects).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(projects)
}

func (s *Server) handleCreateProject(c *fiber.Ctx) error {
	var input CreateProjectInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	if input.Name == "" || input.RepoFullName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name and repo_fullname are required"})
	}

	var nameRe = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$`)
	if !nameRe.MatchString(input.Name) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid name format. use lowercase, numbers, and dashes"})
	}

	// Sanitize repo full name if user entered full URL
	repo := strings.TrimSpace(input.RepoFullName)
	repo = strings.TrimPrefix(repo, "https://github.com/")
	repo = strings.TrimPrefix(repo, "http://github.com/")
	repo = strings.TrimPrefix(repo, "git@github.com:")
	repo = strings.TrimSuffix(repo, ".git")
	input.RepoFullName = repo

	var repoRe = regexp.MustCompile(`^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`)
	if !repoRe.MatchString(input.RepoFullName) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid repo_fullname format"})
	}

	if input.Branch == "" {
		input.Branch = "main"
	}
	var branchRe = regexp.MustCompile(`^[A-Za-z0-9._/-]{1,100}$`)
	if !branchRe.MatchString(input.Branch) || strings.HasPrefix(input.Branch, "-") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid branch format"})
	}

	if input.TargetPort == 0 {
		input.TargetPort = 3000
	}
	if input.HealthcheckPath == "" {
		input.HealthcheckPath = "/"
	}
	
	if input.MemoryLimitMB == 0 {
		input.MemoryLimitMB = 512
	} else if input.MemoryLimitMB < 64 || input.MemoryLimitMB > 8192 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "memory_limit_mb must be between 64 and 8192"})
	}

	if input.CPULimit == 0 {
		input.CPULimit = 1.0
	} else if input.CPULimit < 0.1 || input.CPULimit > 32.0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cpu_limit must be between 0.1 and 32.0"})
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
		"message":           "rollback queued",
		"deployment_id":     rollbackDeploy.ID,
		"target_image_hash": prevDeployment.ImageHash,
	})
}

func (s *Server) handleAttachDatabase(c *fiber.Ctx) error {
	projectID := c.Params("id")
	var input AttachDBInput
	if err := c.BodyParser(&input); err != nil || input.MarketplaceServiceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "marketplace_service_id is required"})
	}

	creds, err := s.dbManager.AttachDatabaseToProject(projectID, input.MarketplaceServiceID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":      "database attached successfully",
		"project_id":   projectID,
		"service_name": creds.ServiceName,
		"injected_uri": creds.InternalURI,
	})
}

func (s *Server) handleGetDeployment(c *fiber.Ctx) error {
	id := c.Params("id")
	var deployment db.Deployment
	if err := s.db.Preload("Remediation").First(&deployment, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "deployment not found"})
	}
	return c.JSON(deployment)
}

func (s *Server) handleGetDeploymentLogs(c *fiber.Ctx) error {
	id := c.Params("id")
	var deployment db.Deployment
	if err := s.db.First(&deployment, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "deployment not found"})
	}
	logFilePath := deployment.LogFilePath
	if logFilePath == "" {
		logFilePath = filepath.Join(".", "data", "logs", fmt.Sprintf("%s.log", id))
	}
	content, err := os.ReadFile(logFilePath)
	if err != nil {
		return c.JSON(fiber.Map{"logs": ""})
	}
	return c.JSON(fiber.Map{"logs": string(content)})
}

type SetDomainInput struct {
	Domain string `json:"domain"`
}

func syncProjectNginxVhost(project *db.Project) {
	nginxVhostDirs := []string{"/www/server/panel/vhost/nginx", "/etc/nginx/conf.d", "/etc/nginx/sites-enabled"}
	hostPort := project.TargetPort
	if hostPort <= 0 {
		hostPort = 3000
	}
	out, err := exec.Command("docker", "port", "spanel-app-"+project.Name).Output()
	if err == nil {
		lines := strings.Split(string(out), "\n")
		for _, l := range lines {
			if strings.Contains(l, "->") {
				parts := strings.Split(l, "->")
				if len(parts) >= 2 {
					addr := strings.TrimSpace(parts[1])
					colonIdx := strings.LastIndex(addr, ":")
					if colonIdx != -1 {
						if p, pErr := strconv.Atoi(addr[colonIdx+1:]); pErr == nil && p > 0 {
							hostPort = p
							break
						}
					}
				}
			}
		}
	}

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
			}
		}
	}
}

func (s *Server) handleSetProjectDomain(c *fiber.Ctx) error {
	projectID := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "project not found"})
	}

	var input SetDomainInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	domain := strings.TrimSpace(input.Domain)
	if domain != "" {
		// regex to validate domain format (no http/https, valid hostname)
		domainRe := regexp.MustCompile(`^(?i)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$`)
		if !domainRe.MatchString(domain) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format domain tidak valid (jangan gunakan http:// atau https://)"})
		}
	}

	project.CustomDomain = domain
	if err := s.db.Save(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save domain"})
	}

	// Immediate live sync to host Nginx reverse proxy
	syncProjectNginxVhost(&project)

	return c.JSON(fiber.Map{
		"message":       "domain updated successfully",
		"custom_domain": project.CustomDomain,
	})
}

func (s *Server) handleVerifyProjectDomain(c *fiber.Ctx) error {
	projectID := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "project not found"})
	}

	domain := strings.TrimSpace(c.Query("domain"))
	if domain == "" {
		domain = strings.TrimSpace(project.CustomDomain)
	}
	if domain == "" {
		return c.JSON(fiber.Map{
			"configured": false,
			"message":    "Belum ada custom domain yang diatur",
		})
	}

	ips, err := net.LookupHost(domain)
	pointsToServer := false
	if err == nil {
		for _, ip := range ips {
			if ip == s.cfg.HostIP {
				pointsToServer = true
				break
			}
		}
	}

	status := "pending"
	if pointsToServer {
		status = "connected"
	} else if len(ips) > 0 {
		status = "misconfigured"
	}

	return c.JSON(fiber.Map{
		"configured":       true,
		"domain":           domain,
		"server_ip":        s.cfg.HostIP,
		"resolved_ips":     ips,
		"points_to_server": pointsToServer,
		"status":           status,
	})
}

func (s *Server) handleDeleteProject(c *fiber.Ctx) error {
	id := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}

	exec.Command("docker", "rm", "-f", "spanel-app-"+project.Name).Run()
	exec.Command("docker", "volume", "rm", "spanel-app-"+project.Name+"_data").Run()

	// Clean up host Nginx vhost if present
	nginxVhostDirs := []string{"/www/server/panel/vhost/nginx", "/etc/nginx/conf.d", "/etc/nginx/sites-enabled"}
	for _, dir := range nginxVhostDirs {
		confPath := filepath.Join(dir, fmt.Sprintf("spanel-%s.conf", project.Name))
		if _, err := os.Stat(confPath); err == nil {
			_ = os.Remove(confPath)
			_ = exec.Command("/www/server/nginx/sbin/nginx", "-s", "reload").Run()
			_ = exec.Command("nginx", "-s", "reload").Run()
		}
	}

	s.db.Unscoped().Where("project_id = ?", project.ID).Delete(&db.Deployment{})
	s.db.Unscoped().Where("project_id = ?", project.ID).Delete(&db.EnvironmentVariable{})
	s.db.Unscoped().Where("project_id = ?", project.ID).Delete(&db.Volume{})

	if err := s.db.Unscoped().Delete(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete project"})
	}
	return c.JSON(fiber.Map{"message": "Project deleted successfully"})
}

type UpdateProjectInput struct {
	Branch          string  `json:"branch"`
	CustomDomain    *string `json:"custom_domain"`
	TargetPort      int     `json:"target_port"`
	HealthcheckPath string  `json:"healthcheck_path"`
}

func (s *Server) handleUpdateProject(c *fiber.Ctx) error {
	id := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}
	
	var input UpdateProjectInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	if input.Branch != "" {
		project.Branch = input.Branch
	}
	if input.TargetPort > 0 {
		project.TargetPort = input.TargetPort
	}
	if input.HealthcheckPath != "" {
		project.HealthcheckPath = input.HealthcheckPath
	}
	if input.CustomDomain != nil {
		domain := strings.TrimSpace(*input.CustomDomain)
		if domain != "" {
			domainRe := regexp.MustCompile(`^(?i)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$`)
			if !domainRe.MatchString(domain) {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format domain tidak valid (jangan gunakan http:// atau https://)"})
			}
		}
		project.CustomDomain = domain
	}

	if err := s.db.Save(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update project"})
	}

	syncProjectNginxVhost(&project)

	return c.JSON(project)
}

func (s *Server) handleStartProject(c *fiber.Ctx) error {
	id := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}
	if err := exec.Command("docker", "start", "spanel-app-"+project.Name).Run(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start container: " + err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Started successfully"})
}

func (s *Server) handleStopProject(c *fiber.Ctx) error {
	id := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}
	if err := exec.Command("docker", "stop", "spanel-app-"+project.Name).Run(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to stop container: " + err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Stopped successfully"})
}

func (s *Server) handleRestartProject(c *fiber.Ctx) error {
	id := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}
	if err := exec.Command("docker", "restart", "spanel-app-"+project.Name).Run(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to restart container: " + err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Restarted successfully"})
}


