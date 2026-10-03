package api

import (
	fiber "github.com/gofiber/fiber/v2"
	"spanel/internal/db"
)

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
