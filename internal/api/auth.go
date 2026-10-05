package api

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

func (s *Server) requireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Skip authentication for health check and webhooks and setup
		path := c.Path()
		if path == "/api/health" || path == "/api/setup" || path == "/api/webhooks/github" || (strings.HasPrefix(path, "/api/projects/") && strings.HasSuffix(path, "/webhook")) {
			return c.Next()
		}

		adminHash, err := os.ReadFile("data/admin.key")
		if err != nil || len(adminHash) == 0 {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "SETUP_REQUIRED"})
		}

		token := c.Get("Authorization")
		token = strings.TrimPrefix(token, "Bearer ")

		if token == "" {
			token = c.Cookies("spanel_session")
		}
		if token == "" {
			token = c.Query("token")
		}

		if token == "" || bcrypt.CompareHashAndPassword(adminHash, []byte(token)) != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		}

		return c.Next()
	}
}

func (s *Server) requireSameOrigin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")
		host := c.Get("Host")
		
		// If origin is present, ensure it matches the host to prevent CSRF
		if origin != "" && host != "" {
			if !strings.Contains(origin, host) {
				return c.Status(fiber.StatusForbidden).SendString("CSRF Origin Mismatch")
			}
		}
		
		return c.Next()
	}
}

func (s *Server) handleSetup(c *fiber.Ctx) error {
	var input struct {
		Password string `json:"password"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	if len(input.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Password must be at least 8 characters"})
	}

	if _, err := os.Stat("data/admin.key"); err == nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Already setup"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to secure password"})
	}

	if err := os.WriteFile("data/admin.key", hash, 0600); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save password"})
	}

	return c.JSON(fiber.Map{"message": "Setup complete"})
}
