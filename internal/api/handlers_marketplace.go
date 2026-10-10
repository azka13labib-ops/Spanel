package api

import (
	"context"
	"os/exec"
	"time"

	fiber "github.com/gofiber/fiber/v2"
	"spanel/internal/db"
	"spanel/internal/service"
)

type InstallMarketplaceInput struct {
	ServiceName string `json:"service_name"`
}

type MarketplaceServiceResponse struct {
	db.MarketplaceService
	Credentials *service.DBCredentials `json:"credentials,omitempty"`
}

func (s *Server) handleListMarketplace(c *fiber.Ctx) error {
	var services []db.MarketplaceService
	if err := s.db.Find(&services).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	responses := make([]MarketplaceServiceResponse, 0, len(services))
	for _, svc := range services {
		responses = append(responses, MarketplaceServiceResponse{
			MarketplaceService: svc,
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

	svc, creds, err := s.dbManager.ProvisionDatabase(ctx, input.ServiceName)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":     "service provisioned successfully",
		"service":     svc,
		"credentials": creds,
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

