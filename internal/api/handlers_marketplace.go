package api

import (
	"context"
	"os/exec"
	"strings"
	"time"

	fiber "github.com/gofiber/fiber/v2"
	"spanel/internal/crypto"
	"spanel/internal/db"
	"spanel/internal/service"
)

type InstallMarketplaceInput struct {
	ServiceName     string `json:"service_name"`
	CustomName      string `json:"custom_name"`
	DatabaseName    string `json:"database_name"`
	Username        string `json:"username"`
	Password        string `json:"password"`
	ExposeHostPort  bool   `json:"expose_host_port"`
	HostPort        int    `json:"host_port"`
	AttachProjectID string `json:"attach_project_id"`
}

type LinkedProjectInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type MarketplaceServiceResponse struct {
	db.MarketplaceService
	Credentials    *service.DBCredentials `json:"credentials,omitempty"`
	LinkedProjects []LinkedProjectInfo    `json:"linked_projects,omitempty"`
}

func (s *Server) handleListMarketplace(c *fiber.Ctx) error {
	var services []db.MarketplaceService
	if err := s.db.Find(&services).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	responses := make([]MarketplaceServiceResponse, 0, len(services))
	for _, svc := range services {
		// Inspect real Docker container status
		if svc.ServiceName == "sqlite" {
			sqlitePath := svc.VolumeHostPath
			if sqlitePath == "" {
				sqlitePath = "./data/sqlite/sqlite.db"
			}
			svc.Status = "running"
		} else {
			realStatus := s.dbManager.GetRealContainerStatus(c.Context(), svc.ContainerID)
			svc.Status = realStatus
		}

		// Find linked projects
		var linkedProjects []LinkedProjectInfo
		var envs []db.EnvironmentVariable
		if svc.ServiceName == "sqlite" {
			s.db.Where("key IN ('SQLITE_PATH', 'DB_CONNECTION')").Find(&envs)
		} else {
			s.db.Where("key IN ('DB_HOST', 'DATABASE_URL', 'REDIS_HOST', 'REDIS_URL')").Find(&envs)
		}

		projectIDs := make(map[string]bool)
		for _, env := range envs {
			decrypted, err := crypto.Decrypt(env.ValueEncrypted, s.cfg.MasterKey, "env:"+env.ProjectID+":"+env.Key)
			if err != nil {
				continue
			}
			isLinked := false
			if svc.ServiceName == "sqlite" && (decrypted == "sqlite" || strings.Contains(decrypted, "sqlite.db")) {
				isLinked = true
			} else if strings.Contains(decrypted, svc.InternalHostname) {
				isLinked = true
			}
			if isLinked {
				projectIDs[env.ProjectID] = true
			}
		}

		if len(projectIDs) > 0 {
			var ids []string
			for pID := range projectIDs {
				ids = append(ids, pID)
			}
			var projects []db.Project
			s.db.Select("id", "name").Where("id IN ?", ids).Find(&projects)
			for _, p := range projects {
				linkedProjects = append(linkedProjects, LinkedProjectInfo{
					ID:   p.ID,
					Name: p.Name,
				})
			}
		}

		responses = append(responses, MarketplaceServiceResponse{
			MarketplaceService: svc,
			LinkedProjects:    linkedProjects,
		})
	}

	return c.JSON(responses)
}

func (s *Server) handleInstallMarketplaceService(c *fiber.Ctx) error {
	var input InstallMarketplaceInput
	if err := c.BodyParser(&input); err != nil || input.ServiceName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "service_name is required (postgresql, mysql, redis, sqlite)"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	svc, creds, err := s.dbManager.ProvisionDatabaseWithOptions(ctx, service.ProvisionDatabaseOptions{
		ServiceName:     input.ServiceName,
		CustomName:      input.CustomName,
		DatabaseName:    input.DatabaseName,
		Username:        input.Username,
		Password:        input.Password,
		ExposeHostPort:  input.ExposeHostPort,
		HostPort:        input.HostPort,
		AttachProjectID: input.AttachProjectID,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":     "service provisioned successfully",
		"service":     svc,
		"credentials": creds,
	})
}

func (s *Server) handleRestartMarketplaceService(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := s.dbManager.RestartService(ctx, id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var svc db.MarketplaceService
	if err := s.db.First(&svc, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "service not found"})
	}

	status := s.dbManager.GetRealContainerStatus(ctx, svc.ContainerID)
	return c.JSON(fiber.Map{
		"message": "service restarted successfully",
		"status":  status,
	})
}

func (s *Server) handleGetMarketplaceCredentials(c *fiber.Ctx) error {
	id := c.Params("id")
	var svc db.MarketplaceService
	if err := s.db.First(&svc, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "service not found"})
	}

	creds, err := s.dbManager.GetDecryptedCredentials(&svc)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to decrypt credentials"})
	}

	return c.JSON(creds)
}

func (s *Server) handleDeleteMarketplaceService(c *fiber.Ctx) error {
	id := c.Params("id")
	var svc db.MarketplaceService
	if err := s.db.First(&svc, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "service not found"})
	}

	// Remove docker container
	if svc.ContainerID != "" {
		_ = exec.Command("docker", "rm", "-f", svc.ContainerID).Run()
	}

	s.db.Delete(&svc)

	return c.JSON(fiber.Map{
		"message": "service removed successfully",
		"id":      id,
	})
}

func (s *Server) handleBackupMarketplaceService(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	info, err := s.dbManager.BackupService(ctx, id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "backup created successfully",
		"backup":  info,
	})
}

func (s *Server) handleListMarketplaceBackups(c *fiber.Ctx) error {
	id := c.Params("id")
	backups, err := s.dbManager.ListBackups(id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(backups)
}

type RestoreBackupInput struct {
	Filename string `json:"filename"`
}

func (s *Server) handleRestoreMarketplaceBackup(c *fiber.Ctx) error {
	id := c.Params("id")
	var input RestoreBackupInput
	if err := c.BodyParser(&input); err != nil || input.Filename == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "filename is required"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	if err := s.dbManager.RestoreBackup(ctx, id, input.Filename); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "database restored successfully",
		"file":    input.Filename,
	})
}

