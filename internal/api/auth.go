package api

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"spanel/internal/db"
)

func (s *Server) adminKeyPath() string {
	if s.cfg != nil && s.cfg.DataDir != "" {
		return filepath.Join(s.cfg.DataDir, "admin.key")
	}
	return filepath.Join("data", "admin.key")
}

	func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func generateSessionToken() (string, string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	token := hex.EncodeToString(b)
	return token, hashToken(token), nil
}

func (s *Server) requireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		path := c.Path()

		// Public unauthenticated routes
		if path == "/api/health" ||
			path == "/api/setup" ||
			path == "/api/auth/login" ||
			path == "/api/webhooks/github" ||
			(strings.HasPrefix(path, "/api/projects/") && strings.HasSuffix(path, "/webhook")) {
			return c.Next()
		}

		// Verify setup status
		adminHash, err := os.ReadFile(s.adminKeyPath())
		if err != nil || len(adminHash) == 0 {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"error": "SETUP_REQUIRED",
			})
		}

		// Extract session token:
		// 1. Authorization: Bearer <token>
		// 2. Cookie: spanel_session=<token>
		// 3. Query: ?token=<token> (for WebSocket connections)
		token := c.Get("Authorization")
		token = strings.TrimPrefix(token, "Bearer ")
		token = strings.TrimSpace(token)

		if token == "" {
			token = c.Cookies("spanel_session")
		}
		if token == "" {
			token = c.Query("token")
		}

		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "AUTHENTICATION_REQUIRED",
			})
		}

		// Fast O(1) hash lookup in SQLite — NEVER execute bcrypt per request
		tokenHash := hashToken(token)
		var session db.Session
		now := time.Now()
		err = s.db.Where("token_hash = ? AND revoked_at IS NULL AND expires_at > ?", tokenHash, now).First(&session).Error
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "SESSION_INVALID_OR_EXPIRED",
			})
		}

		c.Locals("user_id", session.UserID)
		c.Locals("session_id", session.ID)

		return c.Next()
	}
}

func (s *Server) requireSameOrigin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")
		host := c.Get("Host")

		if origin != "" && host != "" {
			cleanOrigin := strings.TrimPrefix(strings.TrimPrefix(origin, "https://"), "http://")
			cleanOriginHost := strings.Split(cleanOrigin, ":")[0]
			cleanHost := strings.Split(host, ":")[0]

			if cleanOriginHost != cleanHost && cleanOriginHost != "localhost" && cleanOriginHost != "127.0.0.1" {
				return c.Status(fiber.StatusForbidden).SendString("CSRF Origin Mismatch")
			}
		}

		return c.Next()
	}
}

func (s *Server) handleLogin(c *fiber.Ctx) error {
	var input struct {
		Password string `json:"password"`
	}
	if err := c.BodyParser(&input); err != nil || input.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Password is required",
		})
	}

	adminHash, err := os.ReadFile(s.adminKeyPath())
	if err != nil || len(adminHash) == 0 {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "SETUP_REQUIRED",
		})
	}

	// Bcrypt verification performed ONCE during login
	if err := bcrypt.CompareHashAndPassword(adminHash, []byte(input.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid administrator password",
		})
	}

	token, tokenHash, err := generateSessionToken()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate session",
		})
	}

	expiry := time.Now().Add(7 * 24 * time.Hour) // 7 days session
	sess := db.Session{
		UserID:    "default-admin",
		TokenHash: tokenHash,
		ExpiresAt: expiry,
		IPAddress: c.IP(),
		UserAgent: c.Get("User-Agent"),
	}

	if err := s.db.Create(&sess).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to persist session",
		})
	}

	isSecure := c.Protocol() == "https" || c.Get("X-Forwarded-Proto") == "https"
	c.Cookie(&fiber.Cookie{
		Name:     "spanel_session",
		Value:    token,
		Expires:  expiry,
		HTTPOnly: true,
		SameSite: "Lax",
		Path:     "/",
		Secure:   isSecure,
	})

	return c.JSON(fiber.Map{
		"ok":         true,
		"token":      token,
		"expires_at": expiry.Format(time.RFC3339),
		"user": fiber.Map{
			"id":       "default-admin",
			"username": "admin",
			"role":     "admin",
		},
	})
}

func (s *Server) handleLogout(c *fiber.Ctx) error {
	token := c.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")
	token = strings.TrimSpace(token)

	if token == "" {
		token = c.Cookies("spanel_session")
	}
	if token == "" {
		token = c.Query("token")
	}

	if token != "" {
		tokenHash := hashToken(token)
		now := time.Now()
		_ = s.db.Model(&db.Session{}).Where("token_hash = ?", tokenHash).Update("revoked_at", &now).Error
	}

	// Clear session cookie
	c.Cookie(&fiber.Cookie{
		Name:     "spanel_session",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		SameSite: "Lax",
		Path:     "/",
	})

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "Logged out successfully",
	})
}

func (s *Server) handleGetMe(c *fiber.Ctx) error {
	userID := c.Locals("user_id")
	if userID == nil {
		userID = "default-admin"
	}

	return c.JSON(fiber.Map{
		"authenticated": true,
		"user": fiber.Map{
			"id":       userID,
			"username": "admin",
			"role":     "admin",
		},
	})
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

	if _, err := os.Stat(s.adminKeyPath()); err == nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Already setup"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to secure password"})
	}

	_ = os.MkdirAll(filepath.Dir(s.adminKeyPath()), 0755)
	if err := os.WriteFile(s.adminKeyPath(), hash, 0600); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save password"})
	}

	// Create initial session for immediate login after setup
	token, tokenHash, err := generateSessionToken()
	if err == nil {
		expiry := time.Now().Add(7 * 24 * time.Hour)
		sess := db.Session{
			UserID:    "default-admin",
			TokenHash: tokenHash,
			ExpiresAt: expiry,
			IPAddress: c.IP(),
			UserAgent: c.Get("User-Agent"),
		}
		_ = s.db.Create(&sess).Error

		isSecure := c.Protocol() == "https" || c.Get("X-Forwarded-Proto") == "https"
		c.Cookie(&fiber.Cookie{
			Name:     "spanel_session",
			Value:    token,
			Expires:  expiry,
			HTTPOnly: true,
			SameSite: "Lax",
			Path:     "/",
			Secure:   isSecure,
		})

		return c.JSON(fiber.Map{
			"message": "Setup complete",
			"token":   token,
		})
	}

	return c.JSON(fiber.Map{"message": "Setup complete"})
}
