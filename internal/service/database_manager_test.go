package service

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"spanel/internal/config"
	"spanel/internal/crypto"
	"spanel/internal/db"
)

func setupTestDBForDBManager(t *testing.T) (*gorm.DB, *config.Config, func()) {
	t.Helper()
	tempDir, err := os.MkdirTemp("", "spanel-dbmanager-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	cfg := &config.Config{
		DataDir:      tempDir,
		DatabasePath: filepath.Join(tempDir, "test.db"),
		MasterKey:    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
	}

	database, err := gorm.Open(sqlite.Open(cfg.DatabasePath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}

	_ = database.AutoMigrate(
		&db.Project{},
		&db.MarketplaceService{},
		&db.EnvironmentVariable{},
		&db.Volume{},
	)

	cleanup := func() {
		sqlDB, _ := database.DB()
		if sqlDB != nil {
			_ = sqlDB.Close()
		}
		_ = os.RemoveAll(tempDir)
	}

	return database, cfg, cleanup
}

func TestAttachDatabaseToProject_Postgres(t *testing.T) {
	database, cfg, cleanup := setupTestDBForDBManager(t)
	defer cleanup()

	mgr := NewDatabaseManager(database, cfg)

	project := db.Project{
		BaseModel: db.BaseModel{ID: "proj-test-1"},
		Name:      "my-laravel-app",
	}
	if err := database.Create(&project).Error; err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	creds := DBCredentials{
		ServiceName:  "postgresql",
		Username:     "spanel_user",
		Password:     "secret_pg_pass_123",
		DatabaseName: "laravel_db",
		Port:         5432,
		Host:         "spanel-postgres-1",
		InternalURI:  "postgres://spanel_user:secret_pg_pass_123@spanel-postgres-1:5432/laravel_db?sslmode=disable",
	}
	credsJSON, _ := json.Marshal(creds)
	encCreds, err := crypto.Encrypt(string(credsJSON), cfg.MasterKey, "mkt:service:postgresql")
	if err != nil {
		t.Fatalf("failed to encrypt creds: %v", err)
	}

	service := db.MarketplaceService{
		BaseModel:            db.BaseModel{ID: "mkt-pg-1"},
		ServiceName:          "postgresql",
		DisplayName:          "PostgreSQL 16",
		ContainerID:          "spanel-postgres-1",
		InternalPort:         5432,
		Status:               "running",
		CredentialsEncrypted: encCreds,
	}
	if err := database.Create(&service).Error; err != nil {
		t.Fatalf("failed to create service: %v", err)
	}

	returnedCreds, err := mgr.AttachDatabaseToProject(project.ID, service.ID)
	if err != nil {
		t.Fatalf("AttachDatabaseToProject failed: %v", err)
	}
	if returnedCreds.DatabaseName != "laravel_db" {
		t.Errorf("expected DatabaseName laravel_db, got %s", returnedCreds.DatabaseName)
	}

	// Verify environment variables in database
	var envs []db.EnvironmentVariable
	if err := database.Where("project_id = ?", project.ID).Find(&envs).Error; err != nil {
		t.Fatalf("failed to query envs: %v", err)
	}

	expectedVars := map[string]struct {
		isSecret    bool
		expectedVal string
	}{
		"DB_CONNECTION": {isSecret: false, expectedVal: "pgsql"},
		"DB_HOST":       {isSecret: false, expectedVal: "spanel-postgres-1"},
		"DB_PORT":       {isSecret: false, expectedVal: "5432"},
		"DB_DATABASE":   {isSecret: false, expectedVal: "laravel_db"},
		"DB_USERNAME":   {isSecret: false, expectedVal: "spanel_user"},
		"DB_PASSWORD":   {isSecret: true, expectedVal: "secret_pg_pass_123"},
		"DATABASE_URL":  {isSecret: true, expectedVal: "postgres://spanel_user:secret_pg_pass_123@spanel-postgres-1:5432/laravel_db?sslmode=disable"},
	}

	if len(envs) != len(expectedVars) {
		t.Errorf("expected %d env vars, got %d", len(expectedVars), len(envs))
	}

	for _, env := range envs {
		exp, ok := expectedVars[env.Key]
		if !ok {
			t.Errorf("unexpected env var created: %s", env.Key)
			continue
		}

		if env.Scope != db.ScopeRuntime {
			t.Errorf("env var %s expected scope runtime, got %s", env.Key, env.Scope)
		}
		if !env.IsSystemInjected {
			t.Errorf("env var %s expected IsSystemInjected true", env.Key)
		}
		if env.IsSecret != exp.isSecret {
			t.Errorf("env var %s expected IsSecret=%v, got %v", env.Key, exp.isSecret, env.IsSecret)
		}

		decVal, err := crypto.Decrypt(env.ValueEncrypted, cfg.MasterKey, "env:"+project.ID+":"+env.Key)
		if err != nil {
			t.Errorf("failed to decrypt env var %s: %v", env.Key, err)
		}
		if decVal != exp.expectedVal {
			t.Errorf("env var %s value mismatch: expected %s, got %s", env.Key, exp.expectedVal, decVal)
		}
	}
}

func TestAttachDatabaseToProject_MySQL(t *testing.T) {
	database, cfg, cleanup := setupTestDBForDBManager(t)
	defer cleanup()

	mgr := NewDatabaseManager(database, cfg)

	project := db.Project{
		BaseModel: db.BaseModel{ID: "proj-test-mysql"},
		Name:      "my-php-app",
	}
	_ = database.Create(&project)

	creds := DBCredentials{
		ServiceName:  "mysql",
		Username:     "spanel_mysql_user",
		Password:     "secret_mysql_pass_456",
		DatabaseName: "mysql_prod",
		Port:         3306,
		Host:         "spanel-mysql-1",
		InternalURI:  "mysql://spanel_mysql_user:secret_mysql_pass_456@tcp(spanel-mysql-1:3306)/mysql_prod",
	}
	credsJSON, _ := json.Marshal(creds)
	encCreds, _ := crypto.Encrypt(string(credsJSON), cfg.MasterKey, "mkt:service:mysql")

	service := db.MarketplaceService{
		BaseModel:            db.BaseModel{ID: "mkt-mysql-1"},
		ServiceName:          "mysql",
		DisplayName:          "MySQL 8.0",
		ContainerID:          "spanel-mysql-1",
		InternalPort:         3306,
		Status:               "running",
		CredentialsEncrypted: encCreds,
	}
	_ = database.Create(&service)

	_, err := mgr.AttachDatabaseToProject(project.ID, service.ID)
	if err != nil {
		t.Fatalf("AttachDatabaseToProject mysql failed: %v", err)
	}

	var envs []db.EnvironmentVariable
	_ = database.Where("project_id = ?", project.ID).Find(&envs)

	envMap := make(map[string]db.EnvironmentVariable)
	for _, env := range envs {
		envMap[env.Key] = env
	}

	if envMap["DB_CONNECTION"].Key == "" {
		t.Fatalf("missing DB_CONNECTION")
	}
	decConn, _ := crypto.Decrypt(envMap["DB_CONNECTION"].ValueEncrypted, cfg.MasterKey, "env:"+project.ID+":DB_CONNECTION")
	if decConn != "mysql" {
		t.Errorf("expected DB_CONNECTION mysql, got %s", decConn)
	}

	decPort, _ := crypto.Decrypt(envMap["DB_PORT"].ValueEncrypted, cfg.MasterKey, "env:"+project.ID+":DB_PORT")
	if decPort != "3306" {
		t.Errorf("expected DB_PORT 3306, got %s", decPort)
	}
}

func TestAttachDatabaseToProject_Redis(t *testing.T) {
	database, cfg, cleanup := setupTestDBForDBManager(t)
	defer cleanup()

	mgr := NewDatabaseManager(database, cfg)

	project := db.Project{
		BaseModel: db.BaseModel{ID: "proj-test-redis"},
		Name:      "my-node-app",
	}
	_ = database.Create(&project)

	creds := DBCredentials{
		ServiceName:  "redis",
		Password:     "redis_auth_pass_999",
		Port:         6379,
		Host:         "spanel-redis-app",
		InternalURI:  "redis://:redis_auth_pass_999@spanel-redis-app:6379/0",
	}
	credsJSON, _ := json.Marshal(creds)
	encCreds, _ := crypto.Encrypt(string(credsJSON), cfg.MasterKey, "mkt:service:redis")

	service := db.MarketplaceService{
		BaseModel:            db.BaseModel{ID: "mkt-redis-1"},
		ServiceName:          "redis",
		DisplayName:          "Redis 7.2",
		ContainerID:          "spanel-redis-app",
		InternalPort:         6379,
		Status:               "running",
		CredentialsEncrypted: encCreds,
	}
	_ = database.Create(&service)

	_, err := mgr.AttachDatabaseToProject(project.ID, service.ID)
	if err != nil {
		t.Fatalf("AttachDatabaseToProject redis failed: %v", err)
	}

	var envs []db.EnvironmentVariable
	_ = database.Where("project_id = ?", project.ID).Find(&envs)

	envMap := make(map[string]db.EnvironmentVariable)
	for _, env := range envs {
		envMap[env.Key] = env
	}

	expectedRedisKeys := []string{"REDIS_URL", "REDIS_HOST", "REDIS_PORT", "REDIS_PASSWORD"}
	for _, k := range expectedRedisKeys {
		if _, ok := envMap[k]; !ok {
			t.Errorf("missing expected Redis env var: %s", k)
		}
	}

	if !envMap["REDIS_PASSWORD"].IsSecret {
		t.Errorf("expected REDIS_PASSWORD to have IsSecret: true")
	}
}

func TestAttachDatabaseToProject_SQLite(t *testing.T) {
	database, cfg, cleanup := setupTestDBForDBManager(t)
	defer cleanup()

	mgr := NewDatabaseManager(database, cfg)

	project := db.Project{
		BaseModel: db.BaseModel{ID: "proj-test-sqlite"},
		Name:      "my-sqlite-app",
	}
	_ = database.Create(&project)

	creds := DBCredentials{
		ServiceName:  "sqlite",
		DatabaseName: "sqlite.db",
		Port:         0,
		Host:         "localhost",
		InternalURI:  "file:/data/sqlite.db",
	}
	credsJSON, _ := json.Marshal(creds)
	encCreds, _ := crypto.Encrypt(string(credsJSON), cfg.MasterKey, "mkt:service:sqlite")

	service := db.MarketplaceService{
		BaseModel:            db.BaseModel{ID: "mkt-sqlite-1"},
		ServiceName:          "sqlite",
		DisplayName:          "SQLite 3",
		ContainerID:          "local-file",
		InternalPort:         0,
		Status:               "running",
		CredentialsEncrypted: encCreds,
	}
	_ = database.Create(&service)

	_, err := mgr.AttachDatabaseToProject(project.ID, service.ID)
	if err != nil {
		t.Fatalf("AttachDatabaseToProject sqlite failed: %v", err)
	}

	// Verify Volume creation
	var vol db.Volume
	if err := database.Where("project_id = ? AND name = ?", project.ID, "sqlite-data").First(&vol).Error; err != nil {
		t.Fatalf("expected sqlite-data volume to be created: %v", err)
	}
	if vol.ContainerPath != "/data" {
		t.Errorf("expected container path /data, got %s", vol.ContainerPath)
	}

	// Verify Env vars
	var envs []db.EnvironmentVariable
	_ = database.Where("project_id = ?", project.ID).Find(&envs)
	envMap := make(map[string]db.EnvironmentVariable)
	for _, env := range envs {
		envMap[env.Key] = env
	}

	decConn, _ := crypto.Decrypt(envMap["DB_CONNECTION"].ValueEncrypted, cfg.MasterKey, "env:"+project.ID+":DB_CONNECTION")
	if decConn != "sqlite" {
		t.Errorf("expected DB_CONNECTION sqlite, got %s", decConn)
	}
	decPath, _ := crypto.Decrypt(envMap["SQLITE_PATH"].ValueEncrypted, cfg.MasterKey, "env:"+project.ID+":SQLITE_PATH")
	if decPath != "/data/sqlite.db" {
		t.Errorf("expected SQLITE_PATH /data/sqlite.db, got %s", decPath)
	}
}

func TestProvisionDatabaseWithOptions_UnknownService(t *testing.T) {
	database, cfg, cleanup := setupTestDBForDBManager(t)
	defer cleanup()

	mgr := NewDatabaseManager(database, cfg)

	_, _, err := mgr.ProvisionDatabaseWithOptions(context.Background(), ProvisionDatabaseOptions{
		ServiceName: "oracle-db",
	})
	if err == nil {
		t.Errorf("expected error for unsupported database engine, got nil")
	}
}
