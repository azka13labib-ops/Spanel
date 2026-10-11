package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"spanel/internal/config"
	"spanel/internal/db"
	"spanel/internal/queue"
)

func setupTestServer(t *testing.T) (*Server, *config.Config, func()) {
	t.Helper()
	tempDir, err := os.MkdirTemp("", "spanel-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	cfg := &config.Config{
		Port:              "0",
		DataDir:           tempDir,
		DatabasePath:      filepath.Join(tempDir, "test.db"),
		MasterKey:         "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		HostIP:            "127.0.0.1",
		Env:               "test",
		AllowInsecureHTTP: true,
	}

	database, err := gorm.Open(sqlite.Open(cfg.DatabasePath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open test sqlite: %v", err)
	}

	// Auto-migrate tables for testing
	err = database.AutoMigrate(
		&db.User{},
		&db.Session{},
		&db.Project{},
		&db.Deployment{},
		&db.InternalQueueJob{},
		&db.EnvironmentVariable{},
		&db.Volume{},
	)
	if err != nil {
		t.Fatalf("failed to automigrate: %v", err)
	}

	database.Create(&db.User{
		BaseModel:    db.BaseModel{ID: "default-admin"},
		Username:     "admin",
		Email:        "admin@spanel.local",
		PasswordHash: "default",
	})

	q := queue.NewQueue(database)
	srv := NewServer(database, q, cfg, nil, nil)

	cleanup := func() {
		sqlDB, _ := database.DB()
		if sqlDB != nil {
			_ = sqlDB.Close()
		}
		_ = os.RemoveAll(tempDir)
	}

	return srv, cfg, cleanup
}

func getCookie(resp *http.Response, name string) *http.Cookie {
	for _, c := range resp.Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

// 1. Verify Setup and Login Flow: Cookie-only, no token in JSON body
func TestSetupAndLoginFlow(t *testing.T) {
	srv, _, cleanup := setupTestServer(t)
	defer cleanup()

	app := srv.App()

	// Before setup: 503 Service Unavailable
	req := httptest.NewRequest("GET", "/api/system/metrics", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Errorf("expected 503 before setup, got %d", resp.StatusCode)
	}

	// Setup with too short password
	body, _ := json.Marshal(map[string]string{"password": "short"})
	req = httptest.NewRequest("POST", "/api/setup", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400 for short password, got %d", resp.StatusCode)
	}

	// Valid setup
	adminPassword := "SecretAdmin123!"
	body, _ = json.Marshal(map[string]string{"password": adminPassword})
	req = httptest.NewRequest("POST", "/api/setup", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for valid setup, got %d", resp.StatusCode)
	}

	// Verify Setup does NOT return token in JSON body
	var setupData map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&setupData)
	if _, hasToken := setupData["token"]; hasToken {
		t.Errorf("SECURITY FLAW: Setup JSON response exposed session token: %+v", setupData)
	}

	// Verify setup set the session cookie
	setupCookie := getCookie(resp, "spanel_session")
	if setupCookie == nil || setupCookie.Value == "" {
		t.Errorf("expected spanel_session cookie to be set after setup")
	}

	// Prevent duplicate setup
	req = httptest.NewRequest("POST", "/api/setup", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 for duplicate setup, got %d", resp.StatusCode)
	}

	// Wrong password login
	wrongBody, _ := json.Marshal(map[string]string{"password": "wrong-password"})
	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(wrongBody))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401 for wrong password, got %d", resp.StatusCode)
	}

	// Correct password login
	correctBody, _ := json.Marshal(map[string]string{"password": adminPassword})
	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(correctBody))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for correct login, got %d", resp.StatusCode)
	}

	// Verify Login does NOT return token in JSON body
	var loginData map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&loginData)
	if _, hasToken := loginData["token"]; hasToken {
		t.Errorf("SECURITY FLAW: Login JSON response exposed session token: %+v", loginData)
	}

	// Verify cookie is set
	sessionCookie := getCookie(resp, "spanel_session")
	if sessionCookie == nil || sessionCookie.Value == "" {
		t.Fatalf("spanel_session cookie was not set in login response")
	}
	if !sessionCookie.HttpOnly {
		t.Errorf("expected session cookie HttpOnly=true")
	}
}

// 2. Verify Cookie-Only authentication: Bearer and Query-string tokens MUST be rejected
func TestCookieOnlyAuthentication(t *testing.T) {
	srv, cfg, cleanup := setupTestServer(t)
	defer cleanup()

	app := srv.App()

	adminPassword := "TestStrongPassword99!"
	hash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	_ = os.WriteFile(filepath.Join(cfg.DataDir, "admin.key"), hash, 0600)

	// Login to get valid session cookie
	loginBody, _ := json.Marshal(map[string]string{"password": adminPassword})
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	sessionCookie := getCookie(resp, "spanel_session")
	if sessionCookie == nil {
		t.Fatalf("failed to retrieve session cookie from login")
	}
	validToken := sessionCookie.Value

	// Test 1: Bearer token is REJECTED
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+validToken)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("Bearer token was accepted when cookie-only authentication is required! Got %d", resp.StatusCode)
	}

	// Test 2: Query-string token ?token=... is REJECTED
	req = httptest.NewRequest("GET", "/api/system/metrics?token="+validToken, nil)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("Query-string token was accepted when cookie-only authentication is required! Got %d", resp.StatusCode)
	}

	// Test 3: Raw password as Bearer token is REJECTED
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+adminPassword)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("Raw password was accepted as Bearer token! Got %d", resp.StatusCode)
	}

	// Test 4: Cookie authentication SUCCEEDS
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.AddCookie(sessionCookie)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Valid session cookie was not accepted! Expected 200, got %d", resp.StatusCode)
	}

	// Test 5: /api/auth/me succeeds with cookie
	req = httptest.NewRequest("GET", "/api/auth/me", nil)
	req.AddCookie(sessionCookie)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 for /api/auth/me, got %d", resp.StatusCode)
	}
}

// 3. Verify Cookie flags in HTTPS production
func TestCookieFlagsInHTTPSProduction(t *testing.T) {
	srv, cfg, cleanup := setupTestServer(t)
	defer cleanup()

	// Simulate HTTPS production environment
	cfg.Env = "production"
	cfg.CookieSecure = true

	app := srv.App()

	adminPassword := "TestStrongPassword99!"
	hash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	_ = os.WriteFile(filepath.Join(cfg.DataDir, "admin.key"), hash, 0600)

	loginBody, _ := json.Marshal(map[string]string{"password": adminPassword})
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Forwarded-Proto", "https")
	resp, _ := app.Test(req)

	cookie := getCookie(resp, "spanel_session")
	if cookie == nil {
		t.Fatalf("session cookie missing")
	}

	if !cookie.HttpOnly {
		t.Errorf("expected HttpOnly=true on session cookie")
	}
	if !cookie.Secure {
		t.Errorf("expected Secure=true on session cookie for HTTPS production")
	}
	if cookie.Path != "/" {
		t.Errorf("expected Path='/' on session cookie, got '%s'", cookie.Path)
	}
	if cookie.SameSite != http.SameSiteLaxMode {
		t.Errorf("expected SameSite=Lax on session cookie, got '%v'", cookie.SameSite)
	}
}

// 4. Verify CSRF and Origin validation
func TestCSRFAndOriginValidation(t *testing.T) {
	srv, cfg, cleanup := setupTestServer(t)
	defer cleanup()

	app := srv.App()

	adminPassword := "TestStrongPassword99!"
	hash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	_ = os.WriteFile(filepath.Join(cfg.DataDir, "admin.key"), hash, 0600)

	loginBody, _ := json.Marshal(map[string]string{"password": adminPassword})

	// Malicious cross-origin POST rejected
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	req.Host = "spanel.internal:8090"
	req.Header.Set("Origin", "https://attacker.evil.com")
	resp, _ := app.Test(req)
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for cross-origin CSRF request, got %d", resp.StatusCode)
	}

	// Cross-site Sec-Fetch-Site rejected
	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	req.Host = "spanel.internal:8090"
	req.Header.Set("Sec-Fetch-Site", "cross-site")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 for Sec-Fetch-Site cross-site, got %d", resp.StatusCode)
	}

	// Malicious Referer rejected
	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	req.Host = "spanel.internal:8090"
	req.Header.Set("Referer", "https://phishing.com/page")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 for mismatched Referer, got %d", resp.StatusCode)
	}

	// Valid matching Origin accepted
	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	req.Host = "spanel.internal:8090"
	req.Header.Set("Origin", "http://spanel.internal:8090")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 for matching Origin, got %d", resp.StatusCode)
	}

	// Webhooks exempt from CSRF
	webhookReq := httptest.NewRequest("POST", "/api/webhooks/github", bytes.NewReader([]byte("{}")))
	webhookReq.Header.Set("Origin", "https://github.com")
	webhookResp, _ := app.Test(webhookReq)
	// Even if unauthorized/invalid sig, it must NOT be blocked by CSRF (403)
	if webhookResp.StatusCode == http.StatusForbidden {
		t.Errorf("webhook route should be exempt from CSRF origin check")
	}
}

// 5. Verify Password Rotation and Session Revocation
func TestPasswordRotationAndSessionRevocation(t *testing.T) {
	srv, cfg, cleanup := setupTestServer(t)
	defer cleanup()

	app := srv.App()

	oldPassword := "OldSecretPassword123!"
	newPassword := "NewSuperSecurePass456!"
	hash, _ := bcrypt.GenerateFromPassword([]byte(oldPassword), bcrypt.DefaultCost)
	_ = os.WriteFile(filepath.Join(cfg.DataDir, "admin.key"), hash, 0600)

	// Step 1: Login with old password
	loginBody, _ := json.Marshal(map[string]string{"password": oldPassword})
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	oldCookie := getCookie(resp, "spanel_session")
	if oldCookie == nil {
		t.Fatalf("failed to get old session cookie")
	}

	// Verify old session works
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.AddCookie(oldCookie)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 before rotation, got %d", resp.StatusCode)
	}

	// Step 2: Rotate password with invalid current password -> fails 401
	badRotateBody, _ := json.Marshal(map[string]string{
		"current_password": "wrong-current-password",
		"new_password":     newPassword,
	})
	req = httptest.NewRequest("POST", "/api/auth/password", bytes.NewReader(badRotateBody))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(oldCookie)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401 for wrong current password, got %d", resp.StatusCode)
	}

	// Step 3: Rotate password with short new password -> fails 400
	shortRotateBody, _ := json.Marshal(map[string]string{
		"current_password": oldPassword,
		"new_password":     "short",
	})
	req = httptest.NewRequest("POST", "/api/auth/password", bytes.NewReader(shortRotateBody))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(oldCookie)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400 for short new password, got %d", resp.StatusCode)
	}

	// Step 4: Successfully rotate password
	validRotateBody, _ := json.Marshal(map[string]string{
		"current_password": oldPassword,
		"new_password":     newPassword,
	})
	req = httptest.NewRequest("POST", "/api/auth/password", bytes.NewReader(validRotateBody))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(oldCookie)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for valid password rotation, got %d", resp.StatusCode)
	}

	newCookie := getCookie(resp, "spanel_session")
	if newCookie == nil {
		t.Fatalf("new session cookie missing after password rotation")
	}

	// Step 5: Verify OLD session cookie is REVOKED
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.AddCookie(oldCookie)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("SECURITY FLAW: Old session cookie was still accepted after password rotation! Expected 401, got %d", resp.StatusCode)
	}

	// Step 6: Verify NEW session cookie works
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.AddCookie(newCookie)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 with new session cookie, got %d", resp.StatusCode)
	}

	// Step 7: Old password no longer works for login
	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("old password still allowed login after rotation! Got %d", resp.StatusCode)
	}

	// Step 8: New password works for login
	newLoginBody, _ := json.Marshal(map[string]string{"password": newPassword})
	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(newLoginBody))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("new password failed login! Expected 200, got %d", resp.StatusCode)
	}
}

// 6. Verify Logout invalidates the server-side session
func TestSessionRevocationAndLogout(t *testing.T) {
	srv, cfg, cleanup := setupTestServer(t)
	defer cleanup()

	app := srv.App()

	adminPassword := "TestStrongPassword99!"
	hash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	_ = os.WriteFile(filepath.Join(cfg.DataDir, "admin.key"), hash, 0600)

	// Login
	loginBody, _ := json.Marshal(map[string]string{"password": adminPassword})
	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	sessionCookie := getCookie(resp, "spanel_session")
	if sessionCookie == nil {
		t.Fatalf("session cookie missing")
	}

	// Before logout: 200 OK
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.AddCookie(sessionCookie)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 before logout, got %d", resp.StatusCode)
	}

	// Logout
	req = httptest.NewRequest("POST", "/api/auth/logout", nil)
	req.AddCookie(sessionCookie)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for logout, got %d", resp.StatusCode)
	}

	// Verify cookie cleared
	clearedCookie := getCookie(resp, "spanel_session")
	if clearedCookie == nil || clearedCookie.Value != "" {
		t.Errorf("expected session cookie to be cleared on logout")
	}

	// After logout: Old cookie must be rejected (server-side session revoked in DB)
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.AddCookie(sessionCookie)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("revoked session was still accepted! Expected 401, got %d", resp.StatusCode)
	}
}

// 7. Verify Protected HTTP and WebSocket routes reject unauthenticated requests
func TestProtectedRoutesRejectUnauthenticated(t *testing.T) {
	srv, cfg, cleanup := setupTestServer(t)
	defer cleanup()

	app := srv.App()

	adminPassword := "TestStrongPassword99!"
	hash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	_ = os.WriteFile(filepath.Join(cfg.DataDir, "admin.key"), hash, 0600)

	protectedRoutes := []struct {
		method string
		path   string
	}{
		{"GET", "/api/projects"},
		{"GET", "/api/containers"},
		{"GET", "/api/system/metrics"},
		{"GET", "/api/auth/me"},
		{"POST", "/api/projects"},
		{"GET", "/ws/logs/deploy-123"},
		{"GET", "/ws/terminal/project-123"},
		{"GET", "/ws/runtime-logs/project-123"},
	}

	for _, route := range protectedRoutes {
		req := httptest.NewRequest(route.method, route.path, nil)
		resp, _ := app.Test(req)
		if resp.StatusCode != http.StatusUnauthorized {
			t.Errorf("route %s %s was not protected! Expected 401, got %d", route.method, route.path, resp.StatusCode)
		}
	}
}

// 8. Verify CLI ResetAdminPassword functionality
func TestCLIResetAdminPassword(t *testing.T) {
	srv, cfg, cleanup := setupTestServer(t)
	defer cleanup()

	app := srv.App()

	initialPassword := "InitialPass12345!"
	newCLIPassword := "HostResetPassword999!"

	hash, _ := bcrypt.GenerateFromPassword([]byte(initialPassword), bcrypt.DefaultCost)
	_ = os.WriteFile(filepath.Join(cfg.DataDir, "admin.key"), hash, 0600)

	// Create an active session
	token, tokenHash, _ := generateSessionToken()
	sess := db.Session{
		UserID:    "default-admin",
		TokenHash: tokenHash,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	srv.db.Create(&sess)

	// Verify session was active
	req := httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.AddCookie(&http.Cookie{Name: "spanel_session", Value: token})
	resp, _ := app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected active session before CLI reset, got %d", resp.StatusCode)
	}

	// Execute CLI Reset
	err := ResetAdminPassword(cfg.DataDir, srv.db, newCLIPassword)
	if err != nil {
		t.Fatalf("ResetAdminPassword failed: %v", err)
	}

	// Verify old session revoked
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.AddCookie(&http.Cookie{Name: "spanel_session", Value: token})
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("old session still active after CLI reset! Expected 401, got %d", resp.StatusCode)
	}

	// Verify new password can log in
	loginBody, _ := json.Marshal(map[string]string{"password": newCLIPassword})
	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("login with new CLI password failed! Expected 200, got %d", resp.StatusCode)
	}
}

// 9. Verify Frontend Code Audit: No localStorage token storage
func TestFrontendNoLocalStorageTokens(t *testing.T) {
	apiTsPath := filepath.Join("..", "..", "web", "lib", "api.ts")
	data, err := os.ReadFile(apiTsPath)
	if err != nil {
		t.Skip("skipping frontend file check in isolated test runner")
	}

	content := string(data)
	if strings.Contains(content, "localStorage.setItem") {
		t.Errorf("SECURITY AUDIT FAILED: web/lib/api.ts contains localStorage.setItem for session tokens!")
	}
	if strings.Contains(content, "token=") && strings.Contains(content, "getWebSocketUrl") {
		t.Errorf("SECURITY AUDIT FAILED: getWebSocketUrl still appends query parameter token!")
	}
}

// 10. Verify Reverse Proxy Trust: Untrusted clients cannot spoof X-Forwarded headers
func TestReverseProxyTrustAndSpoofingPrevention(t *testing.T) {
	srv, cfg, cleanup := setupTestServer(t)
	defer cleanup()

	// Configure test mode with designated trusted proxy IP and strict transport
	cfg.Env = "test"
	cfg.AllowInsecureHTTP = false
	cfg.TrustedProxies = []string{"192.168.1.100"}

	app := srv.App()

	adminPassword := "TestStrongPassword99!"
	hash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	_ = os.WriteFile(filepath.Join(cfg.DataDir, "admin.key"), hash, 0600)

	// Case A: Untrusted direct client sends spoofed X-Forwarded-Proto: https
	// Should be rejected with 403 HTTPS_REQUIRED because remote IP is not trusted
	spoofedReq := httptest.NewRequest("GET", "/api/system/metrics", nil)
	spoofedReq.Header.Set("X-Test-Client-IP", "203.0.113.50") // Untrusted public IP
	spoofedReq.Header.Set("X-Forwarded-Proto", "https")
	resp, _ := app.Test(spoofedReq)
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("SECURITY FLAW: Untrusted direct client successfully spoofed X-Forwarded-Proto! Expected 403, got %d", resp.StatusCode)
	}

	// Case B: Trusted reverse proxy sends X-Forwarded-Proto: https
	// Must be accepted
	trustedReq := httptest.NewRequest("GET", "/api/system/metrics", nil)
	trustedReq.Header.Set("X-Test-Client-IP", "192.168.1.100") // Matches cfg.TrustedProxies
	trustedReq.Header.Set("X-Forwarded-Proto", "https")
	resp, _ = app.Test(trustedReq)
	// Returns 401 (auth required), proving HTTPS transport check passed and proceeded to auth!
	if resp.StatusCode == http.StatusForbidden {
		t.Errorf("Trusted reverse proxy with X-Forwarded-Proto was rejected by transport check: got %d", resp.StatusCode)
	}

	// Case C: Untrusted direct client attempts CSRF bypass by spoofing X-Forwarded-Host
	loginBody, _ := json.Marshal(map[string]string{"password": adminPassword})
	csrfSpoofReq := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	csrfSpoofReq.Header.Set("Content-Type", "application/json")
	csrfSpoofReq.Host = "real-spanel.com"
	csrfSpoofReq.Header.Set("X-Test-Client-IP", "203.0.113.50") // Untrusted client
	csrfSpoofReq.Header.Set("X-Forwarded-Host", "attacker.evil.com")
	csrfSpoofReq.Header.Set("Origin", "http://attacker.evil.com")
	resp, _ = app.Test(csrfSpoofReq)
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("SECURITY FLAW: Untrusted client spoofed X-Forwarded-Host to bypass CSRF Origin check! Got %d", resp.StatusCode)
	}

	// Case D: Trusted proxy with X-Forwarded-Host matches external domain Origin
	validProxyReq := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	validProxyReq.Header.Set("Content-Type", "application/json")
	validProxyReq.Header.Set("X-Test-Client-IP", "192.168.1.100") // Trusted proxy
	validProxyReq.Header.Set("X-Forwarded-Proto", "https")
	validProxyReq.Header.Set("X-Forwarded-Host", "panel.mycompany.com")
	validProxyReq.Header.Set("Origin", "https://panel.mycompany.com")
	resp, _ = app.Test(validProxyReq)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Trusted reverse proxy request failed login! Expected 200, got %d", resp.StatusCode)
	}
}

// 11. Verify Transport Security: 100.64.0.0/10 is not blindly trusted in production
func TestTransportSecurityPolicy(t *testing.T) {
	srv, cfg, cleanup := setupTestServer(t)
	defer cleanup()

	// Strict test mode without insecure HTTP
	cfg.Env = "test"
	cfg.AllowInsecureHTTP = false
	cfg.TrustedProxies = []string{"127.0.0.1"}

	app := srv.App()

	adminPassword := "TestStrongPassword99!"
	hash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	_ = os.WriteFile(filepath.Join(cfg.DataDir, "admin.key"), hash, 0600)

	// Test 1: Plain HTTP from 100.64.0.0/10 address is REJECTED without deliberate exception
	cgnatReq := httptest.NewRequest("GET", "/api/system/metrics", nil)
	cgnatReq.Header.Set("X-Test-Client-IP", "100.125.7.123")
	resp, _ := app.Test(cgnatReq)
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("SECURITY FLAW: Plaintext HTTP was permitted on 100.64.0.0/10 in production! Expected 403, got %d", resp.StatusCode)
	}

	// Test 2: When deliberate private-network HTTP mode is explicitly set, request is permitted
	cfg.AllowInsecureHTTP = true
	resp, _ = app.Test(cgnatReq)
	// Returns 401 (auth check reached), confirming transport gate passed
	if resp.StatusCode == http.StatusForbidden {
		t.Errorf("Deliberate AllowInsecureHTTP=true was blocked by transport check: got %d", resp.StatusCode)
	}
}

