package db

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Init(dbPath string) (*gorm.DB, error) {
	// Open SQLite with pure-Go driver
	dsn := fmt.Sprintf("%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(10000)&_pragma=synchronous(NORMAL)&_pragma=foreign_keys(1)&_txlock=immediate", dbPath)

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	}

	database, err := gorm.Open(sqlite.Open(dsn), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	sqlDB, err := database.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get generic database object: %w", err)
	}

	// Optimize connection pooling for SQLite WAL mode:
	// WAL allows multiple readers and 1 writer concurrently without lockups.
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetConnMaxLifetime(0)

	// Execute PRAGMAs explicitly just to be certain
	pragmas := []string{
		"PRAGMA journal_mode = WAL;",
		"PRAGMA busy_timeout = 10000;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA foreign_keys = ON;",
	}
	for _, pragma := range pragmas {
		if _, err := sqlDB.Exec(pragma); err != nil {
			log.Printf("[DB WARNING] Failed executing %s: %v", pragma, err)
		}
	}

	// Auto-migrate tables
	err = database.AutoMigrate(
		&User{},
		&AIProvider{},
		&GitHubAccount{},
		&GitHubAppInstallation{},
		&Project{},
		&EnvironmentVariable{},
		&Volume{},
		&Deployment{},
		&InternalQueueJob{},
		&AIRemediation{},
		&MarketplaceService{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to auto-migrate database: %w", err)
	}

	// Seed default-admin user for single-tenant mode
	var defaultUser User
	if err := database.First(&defaultUser, "id = ?", "default-admin").Error; err != nil {
		database.Create(&User{
			BaseModel:    BaseModel{ID: "default-admin"},
			Username:     "admin",
			Email:        "admin@spanel.local",
			PasswordHash: "default",
		})
	}

	DB = database
	log.Printf("[DB] SQLite database initialized in WAL mode at: %s", dbPath)
	return DB, nil
}

func GetRawDB() (*sql.DB, error) {
	if DB == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return DB.DB()
}
