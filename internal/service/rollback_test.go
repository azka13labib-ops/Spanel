package service

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"spanel/internal/config"
	"spanel/internal/db"
	"spanel/internal/queue"
)

func setupTestDB(t *testing.T) (*gorm.DB, *config.Config, func()) {
	t.Helper()
	tempDir, err := os.MkdirTemp("", "spanel-rollback-test-*")
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
		&db.Deployment{},
		&db.InternalQueueJob{},
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

func TestRollbackHandlerWithMissingImage(t *testing.T) {
	database, cfg, cleanup := setupTestDB(t)
	defer cleanup()

	deploySvc := NewDeployService(database, nil, cfg)

	project := db.Project{
		BaseModel:    db.BaseModel{ID: "proj-123"},
		UserID:       "default-admin",
		Name:         "test-app",
		RepoFullName: "user/test-app",
		Branch:       "main",
		Status:       "error",
		TargetPort:   3000,
	}
	database.Create(&project)

	now := time.Now()
	rollbackDeploy := db.Deployment{
		BaseModel:     db.BaseModel{ID: "deploy-rollback-1"},
		ProjectID:     project.ID,
		Status:        "queued",
		ImageHash:     "nonexistent-image-tag-999999",
		CommitMessage: "Rollback to deploy-0",
		StartedAt:     &now,
	}
	database.Create(&rollbackDeploy)

	job := &db.InternalQueueJob{
		BaseModel: db.BaseModel{ID: "job-1"},
		JobType:   "rollback",
		TargetID:  rollbackDeploy.ID,
		Status:    "pending",
	}
	database.Create(job)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := deploySvc.HandleRollback(ctx, job)
	if err == nil {
		t.Errorf("expected error for non-existent image rollback, got nil")
	}

	var updatedDeploy db.Deployment
	database.First(&updatedDeploy, "id = ?", rollbackDeploy.ID)
	if updatedDeploy.Status != "failed" {
		t.Errorf("expected rollback deployment status 'failed', got '%s'", updatedDeploy.Status)
	}

	var updatedProj db.Project
	database.First(&updatedProj, "id = ?", project.ID)
	if updatedProj.Status == "running" {
		t.Errorf("project should not be marked 'running' after failed rollback, got '%s'", updatedProj.Status)
	}
}

func TestQueueRegistersRollbackHandler(t *testing.T) {
	database, cfg, cleanup := setupTestDB(t)
	defer cleanup()

	q := queue.NewQueue(database)
	deploySvc := NewDeployService(database, nil, cfg)

	q.RegisterHandler("deploy", deploySvc.HandleDeploy)
	q.RegisterHandler("rollback", deploySvc.HandleRollback)

	job, err := q.Enqueue("rollback", "target-id-test")
	if err != nil {
		t.Fatalf("failed to enqueue rollback job: %v", err)
	}
	if job.Status != "pending" {
		t.Errorf("expected pending status, got %s", job.Status)
	}
}
