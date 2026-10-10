package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
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
		Port:         "0",
		DataDir:      tempDir,
		DatabasePath: filepath.Join(tempDir, "test.db"),
		MasterKey:    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		HostIP:       "127.0.0.1",
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

	// Seed default-admin
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

func TestSetupAndLoginFlow(t *testing.T) {
	srv, _, cleanup := setupTestServer(t)
	defer cleanup()

	app := srv.App()

	// 1. Initial state: before setup, protected endpoint returns 503 SETUP_REQUIRED
	req := httptest.NewRequest("GET", "/api/system/metrics", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Errorf("expected 503 before setup, got %d", resp.StatusCode)
	}

	// 2. Setup with password too short (< 8 chars)
	body, _ := json.Marshal(map[string]string{"password": "short"})
	req = httptest.NewRequest("POST", "/api/setup", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400 for short password, got %d", resp.StatusCode)
	}

	// 3. Setup with valid password
	adminPassword := "SecretAdmin123!"
	body, _ = json.Marshal(map[string]string{"password": adminPassword})
	req = httptest.NewRequest("POST", "/api/setup", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for valid setup, got %d", resp.StatusCode)
	}

	// 4. Duplicate setup rejected
	req = httptest.NewRequest("POST", "/api/setup", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 for duplicate setup, got %d", resp.StatusCode)
	}

	// 5. Login with invalid password
	wrongBody, _ := json.Marshal(map[string]string{"password": "wrong-password"})
	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(wrongBody))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401 for wrong password, got %d", resp.StatusCode)
	}

	// 6. Login with correct password
	correctBody, _ := json.Marshal(map[string]string{"password": adminPassword})
	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(correctBody))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for correct login, got %d", resp.StatusCode)
	}

	var loginData struct {
		OK    bool   `json:"ok"`
		Token string `json:"token"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&loginData)
	if !loginData.OK || loginData.Token == "" {
		t.Fatalf("login response missing token: %+v", loginData)
	}

	// Verify cookie is set
	cookies := resp.Cookies()
	var sessionCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "spanel_session" {
			sessionCookie = c
			break
		}
	}
	if sessionCookie == nil || sessionCookie.Value != loginData.Token {
		t.Errorf("spanel_session cookie was not properly set")
	}
}

func TestSessionValidationAndProtectedEndpoints(t *testing.T) {
	srv, cfg, cleanup := setupTestServer(t)
	defer cleanup()

	app := srv.App()

	// Pre-seed admin key
	adminPassword := "TestStrongPassword99!"
	hash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	_ = os.WriteFile(filepath.Join(cfg.DataDir, "admin.key"), hash, 0600)

	// 1. Request protected endpoint without auth -> 401
	req := httptest.NewRequest("GET", "/api/system/metrics", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401 for unauthenticated request, got %d", resp.StatusCode)
	}

	// 2. RAW PASSWORD AS TOKEN MUST BE REJECTED! (Security regression test)
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+adminPassword)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("SECURITY FLAW: raw password was accepted as Bearer token! Expected 401, got %d", resp.StatusCode)
	}

	// 3. Login to get valid opaque session token
	loginBody, _ := json.Marshal(map[string]string{"password": adminPassword})
	req = httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	var loginData struct {
		Token string `json:"token"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&loginData)
	validToken := loginData.Token

	// 4. Access protected endpoint with Bearer token
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+validToken)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 with valid session token, got %d", resp.StatusCode)
	}

	// 5. Access protected endpoint with cookie
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.AddCookie(&http.Cookie{Name: "spanel_session", Value: validToken})
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 with session cookie, got %d", resp.StatusCode)
	}

	// 6. Access /api/auth/me
	req = httptest.NewRequest("GET", "/api/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+validToken)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 for /api/auth/me, got %d", resp.StatusCode)
	}
	var meData struct {
		Authenticated bool `json:"authenticated"`
		User          struct {
			Username string `json:"username"`
		} `json:"user"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&meData)
	if !meData.Authenticated || meData.User.Username != "admin" {
		t.Errorf("unexpected /api/auth/me response: %+v", meData)
	}
}

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
	var loginData struct {
		Token string `json:"token"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&loginData)
	token := loginData.Token

	// Verify token works
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 before logout, got %d", resp.StatusCode)
	}

	// Call logout
	req = httptest.NewRequest("POST", "/api/auth/logout", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for logout, got %d", resp.StatusCode)
	}

	// Attempt using token again -> MUST BE REJECTED 401
	req = httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("revoked token was still accepted! Expected 401, got %d", resp.StatusCode)
	}
}

func TestSessionExpiration(t *testing.T) {
	srv, cfg, cleanup := setupTestServer(t)
	defer cleanup()

	app := srv.App()

	adminPassword := "TestStrongPassword99!"
	hash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	_ = os.WriteFile(filepath.Join(cfg.DataDir, "admin.key"), hash, 0600)

	// Manually insert an expired session into DB
	expiredToken := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	expiredHash := hashToken(expiredToken)
	srv.db.Create(&db.Session{
		UserID:    "default-admin",
		TokenHash: expiredHash,
		ExpiresAt: time.Now().Add(-2 * time.Hour), // Expired 2 hours ago
	})

	// Access with expired token
	req := httptest.NewRequest("GET", "/api/system/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+expiredToken)
	resp, _ := app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expired session was accepted! Expected 401, got %d", resp.StatusCode)
	}
}
