package api

import (
	"crypto/subtle"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
)

func (s *Server) requireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Skip authentication for health check and webhooks
		path := c.Path()
		if path == "/api/health" || path == "/api/webhooks/github" || (strings.HasPrefix(path, "/api/projects/") && strings.HasSuffix(path, "/webhook")) {
			return c.Next()
		}

		adminToken := os.Getenv("SPANEL_ADMIN_TOKEN")
		if adminToken == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "SPANEL_ADMIN_TOKEN not set on server"})
		}

		token := c.Get("Authorization")
		token = strings.TrimPrefix(token, "Bearer ")

		if token == "" {
			token = c.Cookies("spanel_session")
		}

		if token == "" || subtle.ConstantTimeCompare([]byte(token), []byte(adminToken)) != 1 {
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
