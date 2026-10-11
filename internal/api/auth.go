package api

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
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

// getClientIP extracts the immediate remote peer IP.
// In test environments only, allows test runners to simulate client IPs using X-Test-Client-IP.
func (s *Server) getClientIP(c *fiber.Ctx) string {
	ip := c.IP()
	if (s.cfg != nil && s.cfg.Env == "test") && (ip == "0.0.0.0" || ip == "" || ip == "127.0.0.1") {
		if testIP := c.Get("X-Test-Client-IP"); testIP != "" {
			return testIP
		}
	}
	return ip
}

// isTrustedProxy checks if the immediate client IP matches any configured trusted reverse proxy.
func (s *Server) isTrustedProxy(remoteIP string) bool {
	if s.cfg == nil || len(s.cfg.TrustedProxies) == 0 {
		return false
	}
	ip := net.ParseIP(remoteIP)
	if ip == nil {
		return false
	}
	for _, trusted := range s.cfg.TrustedProxies {
		if strings.Contains(trusted, "/") {
			_, cidrNet, err := net.ParseCIDR(trusted)
			if err == nil && cidrNet.Contains(ip) {
				return true
			}
		} else {
			trustedIP := net.ParseIP(trusted)
			if trustedIP != nil && trustedIP.Equal(ip) {
				return true
			}
		}
	}
	return false
}

// isHTTPSRequest determines if the request was delivered over TLS/HTTPS.
// CRITICAL: Fiber's c.Protocol() blindly trusts X-Forwarded-Proto from anyone.
// Here we strictly check c.Context().IsTLS() OR only trust X-Forwarded-Proto if from a verified trusted proxy.
func (s *Server) isHTTPSRequest(c *fiber.Ctx) bool {
	if c.Context().IsTLS() {
		return true
	}
	clientIP := s.getClientIP(c)
	if s.isTrustedProxy(clientIP) {
		return strings.EqualFold(c.Get("X-Forwarded-Proto"), "https")
	}
	return false
}

// getEffectiveHost returns the host for Origin/CSRF validation.
// X-Forwarded-Host is only honored if the connection arrives through an explicitly trusted proxy.
func (s *Server) getEffectiveHost(c *fiber.Ctx) string {
	clientIP := s.getClientIP(c)
	if s.isTrustedProxy(clientIP) {
		forwardedHost := c.Get("X-Forwarded-Host")
		if forwardedHost != "" {
			return forwardedHost
		}
	}
	return c.Get("Host")
}

func (s *Server) setSessionCookie(c *fiber.Ctx, token string, expiry time.Time) {
	isSecure := s.isHTTPSRequest(c) || (s.cfg != nil && s.cfg.CookieSecure)
	c.Cookie(&fiber.Cookie{
		Name:     "spanel_session",
		Value:    token,
		Expires:  expiry,
		HTTPOnly: true,
		SameSite: "Lax",
		Path:     "/",
		Secure:   isSecure,
	})
}

func (s *Server) clearSessionCookie(c *fiber.Ctx) {
	isSecure := s.isHTTPSRequest(c) || (s.cfg != nil && s.cfg.CookieSecure)
	c.Cookie(&fiber.Cookie{
		Name:     "spanel_session",
		Value:    "",
		Expires:  time.Now().Add(-24 * time.Hour),
		MaxAge:   -1,
		HTTPOnly: true,
		SameSite: "Lax",
		Path:     "/",
		Secure:   isSecure,
	})
}

// isMatchingOrigin verifies that the incoming Origin or Referer matches the server's effective host.
func (s *Server) isMatchingOrigin(originURL string, effectiveHost string) bool {
	if originURL == "" || effectiveHost == "" {
		return false
	}
	u, err := url.Parse(originURL)
	if err != nil {
		return false
	}

	// 1. Exact host comparison (e.g. "myserver.com:8090" == "myserver.com:8090")
	if strings.EqualFold(u.Host, effectiveHost) {
		return true
	}

	// 2. Hostname comparison without port (if reverse proxy strips or standardizes ports)
	originHostname := u.Hostname()
	targetHostname := strings.Split(effectiveHost, ":")[0]
	if strings.EqualFold(originHostname, targetHostname) {
		return true
	}

	// 3. Localhost development environment (only permitted if the effective host itself is loopback)
	if (originHostname == "localhost" || originHostname == "127.0.0.1") &&
		(targetHostname == "localhost" || targetHostname == "127.0.0.1") {
		return true
	}

	return false
}

// requireSecureTransport ensures production requests use HTTPS.
// Deliberate plaintext HTTP requires SPANEL_ALLOW_INSECURE_HTTP=true.
func (s *Server) requireSecureTransport() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Health check endpoint is public and exempt from HTTPS requirement for liveness probes
		if c.Path() == "/api/health" {
			return c.Next()
		}

		if s.isHTTPSRequest(c) {
			return c.Next()
		}

		if s.cfg != nil && s.cfg.AllowInsecureHTTP {
			return c.Next()
		}

		// Loopback connections are allowed for local health checks/debugging
		clientIP := s.getClientIP(c)
		ip := net.ParseIP(clientIP)
		if ip != nil && ip.IsLoopback() {
			return c.Next()
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":   "HTTPS_REQUIRED",
			"message": "HTTPS is required for production deployments. To enable unencrypted private-network HTTP access, set SPANEL_ALLOW_INSECURE_HTTP=true.",
		})
	}
}

// requireCSRFProtection validates Origin and Referer headers for state-changing HTTP requests.
func (s *Server) requireCSRFProtection() fiber.Handler {
	return func(c *fiber.Ctx) error {
		method := c.Method()
		if method != fiber.MethodPost && method != fiber.MethodPut && method != fiber.MethodDelete && method != fiber.MethodPatch {
			return c.Next()
		}

		path := c.Path()
		// Webhook callbacks and documentation chat are public endpoints
		if path == "/api/webhooks/github" || path == "/api/docs/chat" || (strings.HasPrefix(path, "/api/projects/") && strings.HasSuffix(path, "/webhook")) {
			return c.Next()
		}

		effectiveHost := s.getEffectiveHost(c)

		origin := c.Get("Origin")
		if origin != "" {
			if !s.isMatchingOrigin(origin, effectiveHost) {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "CSRF_ORIGIN_MISMATCH",
				})
			}
			return c.Next()
		}

		referer := c.Get("Referer")
		if referer != "" {
			if !s.isMatchingOrigin(referer, effectiveHost) {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "CSRF_REFERER_MISMATCH",
				})
			}
			return c.Next()
		}

		secFetchSite := c.Get("Sec-Fetch-Site")
		if secFetchSite == "cross-site" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "CSRF_CROSS_SITE_REQUEST",
			})
		}

		return c.Next()
	}
}

// requireSameOrigin validates Origin for WebSocket handshake connections.
func (s *Server) requireSameOrigin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")
		effectiveHost := s.getEffectiveHost(c)

		if origin != "" {
			if !s.isMatchingOrigin(origin, effectiveHost) {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "CSRF_ORIGIN_MISMATCH",
				})
			}
		}

		return c.Next()
	}
}

// requireAuth enforces strictly cookie-only web authentication.
// Bearer-token headers and query-string tokens are rejected.
func (s *Server) requireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		path := c.Path()

		// Public unauthenticated routes
		if path == "/api/health" ||
			path == "/api/setup" ||
			path == "/api/auth/login" ||
			path == "/api/docs/chat" ||
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

		// Strictly extract session token from cookie ONLY
		token := c.Cookies("spanel_session")
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "AUTHENTICATION_REQUIRED",
			})
		}

		// Fast O(1) SHA-256 hash lookup in SQLite
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
		IPAddress: s.getClientIP(c),
		UserAgent: c.Get("User-Agent"),
	}

	if err := s.db.Create(&sess).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to persist session",
		})
	}

	s.setSessionCookie(c, token, expiry)

	// Cookie-only authentication: NEVER return session token in JSON body
	return c.JSON(fiber.Map{
		"ok":         true,
		"expires_at": expiry.Format(time.RFC3339),
		"user": fiber.Map{
			"id":       "default-admin",
			"username": "admin",
			"role":     "admin",
		},
	})
}

func (s *Server) handleLogout(c *fiber.Ctx) error {
	token := c.Cookies("spanel_session")
	if token != "" {
		tokenHash := hashToken(token)
		now := time.Now()
		_ = s.db.Model(&db.Session{}).Where("token_hash = ?", tokenHash).Update("revoked_at", &now).Error
	}

	s.clearSessionCookie(c)

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "Logged out successfully",
	})
}

type RotatePasswordInput struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (s *Server) handleRotatePassword(c *fiber.Ctx) error {
	var input RotatePasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if input.CurrentPassword == "" || input.NewPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Both current_password and new_password are required"})
	}

	if len(input.NewPassword) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "New password must be at least 8 characters"})
	}

	if input.CurrentPassword == input.NewPassword {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "New password must be different from current password"})
	}

	adminHash, err := os.ReadFile(s.adminKeyPath())
	if err != nil || len(adminHash) == 0 {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "SETUP_REQUIRED"})
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword(adminHash, []byte(input.CurrentPassword)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Current password is incorrect"})
	}

	// Hash new password
	newHash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to secure new password"})
	}

	// Write atomically to admin.key
	if err := os.WriteFile(s.adminKeyPath(), newHash, 0600); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save new password"})
	}

	userID := c.Locals("user_id")
	if userID == nil {
		userID = "default-admin"
	}

	// Revoke ALL existing active sessions for this user
	now := time.Now()
	_ = s.db.Model(&db.Session{}).Where("user_id = ? AND revoked_at IS NULL", userID).Update("revoked_at", &now).Error

	// Issue a fresh new session for the current authenticated browser
	token, tokenHash, err := generateSessionToken()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate new session"})
	}

	expiry := time.Now().Add(7 * 24 * time.Hour)
	sess := db.Session{
		UserID:    userID.(string),
		TokenHash: tokenHash,
		ExpiresAt: expiry,
		IPAddress: s.getClientIP(c),
		UserAgent: c.Get("User-Agent"),
	}
	_ = s.db.Create(&sess).Error

	s.setSessionCookie(c, token, expiry)

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "Password updated successfully. All other active sessions have been revoked.",
	})
}

// ResetAdminPassword resets administrator credentials from host CLI or automated scripts,
// updates admin.key with strict permissions, and revokes all active sessions in SQLite.
func ResetAdminPassword(dataDir string, database *gorm.DB, newPassword string) error {
	newPassword = strings.TrimSpace(newPassword)
	if len(newPassword) < 8 {
		return fmt.Errorf("password must be at least 8 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	keyPath := filepath.Join(dataDir, "admin.key")
	_ = os.MkdirAll(filepath.Dir(keyPath), 0755)
	if err := os.WriteFile(keyPath, hash, 0600); err != nil {
		return fmt.Errorf("failed to write admin key: %w", err)
	}

	if database != nil {
		now := time.Now()
		_ = database.Model(&db.Session{}).Where("user_id = ? AND revoked_at IS NULL", "default-admin").Update("revoked_at", &now).Error
	}

	return nil
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
			IPAddress: s.getClientIP(c),
			UserAgent: c.Get("User-Agent"),
		}
		_ = s.db.Create(&sess).Error

		s.setSessionCookie(c, token, expiry)

		return c.JSON(fiber.Map{
			"ok":      true,
			"message": "Setup complete",
		})
	}

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "Setup complete",
	})
}
