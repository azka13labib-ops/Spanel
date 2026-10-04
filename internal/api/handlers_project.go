package api

import (
	"fmt"
	"os/exec"
	"regexp"
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
