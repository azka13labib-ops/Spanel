package service

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"gorm.io/gorm"
	"spanel/internal/config"
	"spanel/internal/crypto"
	"spanel/internal/db"
)

type DBCredentials struct {
	ServiceName  string `json:"service_name"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	DatabaseName string `json:"database_name"`
	Port         int    `json:"port"`
	Host         string `json:"host"`
	InternalURI  string `json:"internal_uri"`
	ExternalURI  string `json:"external_uri"`
}

type DatabaseManager struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewDatabaseManager(database *gorm.DB, cfg *config.Config) *DatabaseManager {
	return &DatabaseManager{
		db:  database,
		cfg: cfg,
	}
}

func randomString(length int) string {
	bytes := make([]byte, length)
	_, _ = rand.Read(bytes)
	return hex.EncodeToString(bytes)[:length]
}

func (m *DatabaseManager) ProvisionDatabase(ctx context.Context, serviceName string) (*db.MarketplaceService, *DBCredentials, error) {
	serviceName = strings.ToLower(strings.TrimSpace(serviceName))

	_ = exec.CommandContext(ctx, "docker", "network", "create", "spanel-net").Run()

	var creds DBCredentials
	var containerName string
	var internalPort int
	var volumeHostPath string

	switch serviceName {
	case "postgresql", "postgres":
		serviceName = "postgresql"
		containerName = "spanel-postgres"
		internalPort = 5432
		pass := randomString(24)

		creds = DBCredentials{
			ServiceName:  "postgresql",
			Username:     "spanel",
			Password:     pass,
			DatabaseName: "spanel_db",
			Port:         5432,
			Host:         containerName,
			InternalURI:  fmt.Sprintf("postgres://spanel:%s@%s:5432/spanel_db?sslmode=disable", pass, containerName),
			ExternalURI:  fmt.Sprintf("postgres://spanel:%s@localhost:5432/spanel_db?sslmode=disable", pass),
		}

		volumeName := "spanel-vol-postgres"
		_ = exec.CommandContext(ctx, "docker", "volume", "create", volumeName).Run()
		_ = exec.CommandContext(ctx, "docker", "rm", "-f", containerName).Run()

		cmd := exec.CommandContext(ctx, "docker", "run", "-d",
			"--name", containerName,
			"--network", "spanel-net",
			"--restart", "unless-stopped",
			"-v", fmt.Sprintf("%s:/var/lib/postgresql/data", volumeName),
			"-e", "POSTGRES_USER=spanel",
			"-e", fmt.Sprintf("POSTGRES_PASSWORD=%s", pass),
			"-e", "POSTGRES_DB=spanel_db",
			"-p", "127.0.0.1:5432:5432",
			"postgres:16-alpine",
		)
		if out, err := cmd.CombinedOutput(); err != nil {
			return nil, nil, fmt.Errorf("failed to run postgres container: %w (%s)", err, string(out))
		}
		volumeHostPath = volumeName

	case "mysql":
		containerName = "spanel-mysql"
		internalPort = 3306
		pass := randomString(24)

		creds = DBCredentials{
			ServiceName:  "mysql",
			Username:     "spanel",
			Password:     pass,
			DatabaseName: "spanel_db",
			Port:         3306,
			Host:         containerName,
			InternalURI:  fmt.Sprintf("mysql://spanel:%s@tcp(%s:3306)/spanel_db", pass, containerName),
			ExternalURI:  fmt.Sprintf("mysql://spanel:%s@tcp(localhost:3306)/spanel_db", pass),
		}

		volumeName := "spanel-vol-mysql"
		_ = exec.CommandContext(ctx, "docker", "volume", "create", volumeName).Run()
		_ = exec.CommandContext(ctx, "docker", "rm", "-f", containerName).Run()

		cmd := exec.CommandContext(ctx, "docker", "run", "-d",
			"--name", containerName,
			"--network", "spanel-net",
			"--restart", "unless-stopped",
			"-v", fmt.Sprintf("%s:/var/lib/mysql", volumeName),
			"-e", "MYSQL_USER=spanel",
			"-e", fmt.Sprintf("MYSQL_PASSWORD=%s", pass),
			"-e", "MYSQL_DATABASE=spanel_db",
			"-e", fmt.Sprintf("MYSQL_ROOT_PASSWORD=%s", pass),
			"-p", "127.0.0.1:3306:3306",
			"mysql:8.0",
		)
		if out, err := cmd.CombinedOutput(); err != nil {
			return nil, nil, fmt.Errorf("failed to run mysql container: %w (%s)", err, string(out))
		}
		volumeHostPath = volumeName

	case "redis":
		containerName = "spanel-redis"
		internalPort = 6379
		pass := randomString(24)

		creds = DBCredentials{
			ServiceName:  "redis",
			Username:     "default",
			Password:     pass,
			DatabaseName: "0",
			Port:         6379,
			Host:         containerName,
			InternalURI:  fmt.Sprintf("redis://:%s@%s:6379/0", pass, containerName),
			ExternalURI:  fmt.Sprintf("redis://:%s@localhost:6379/0", pass),
		}

		volumeName := "spanel-vol-redis"
		_ = exec.CommandContext(ctx, "docker", "volume", "create", volumeName).Run()
		_ = exec.CommandContext(ctx, "docker", "rm", "-f", containerName).Run()

		cmd := exec.CommandContext(ctx, "docker", "run", "-d",
			"--name", containerName,
			"--network", "spanel-net",
			"--restart", "unless-stopped",
			"-v", fmt.Sprintf("%s:/data", volumeName),
			"-p", "127.0.0.1:6379:6379",
			"redis:7.2-alpine",
			"redis-server", "--requirepass", pass,
		)
		if out, err := cmd.CombinedOutput(); err != nil {
			return nil, nil, fmt.Errorf("failed to run redis container: %w (%s)", err, string(out))
		}
		volumeHostPath = volumeName

	case "sqlite", "sqlite3":
		serviceName = "sqlite"
		containerName = "spanel-sqlite"
		internalPort = 8085

		// 1. Create persistent folder on host: ./data/sqlite/
		sqliteDir, _ := filepath.Abs(filepath.Join(m.cfg.DataDir, "sqlite"))
		_ = os.MkdirAll(sqliteDir, 0755)
		dbFilePath := filepath.Join(sqliteDir, "sqlite.db")

		// 2. Initialize sqlite.db with WAL mode
		if sdb, err := sql.Open("sqlite3", dbFilePath); err == nil {
			_, _ = sdb.Exec("PRAGMA journal_mode=WAL;")
			sdb.Close()
		}

		creds = DBCredentials{
			ServiceName:  "sqlite",
			Username:     "sqlite",
			Password:     "-",
			DatabaseName: "sqlite.db",
			Port:         8085,
			Host:         "localhost",
			InternalURI:  "file:/data/sqlite.db",
			ExternalURI:  fmt.Sprintf("http://localhost:8085 (Web Inspector) | Host Path: %s", dbFilePath),
		}

		volumeHostPath = sqliteDir

		// 3. Optional: Run lightweight SQLite Web Viewer on port 8085 if available
		_ = exec.CommandContext(ctx, "docker", "rm", "-f", "spanel-sqlite-web").Run()
		runWeb := exec.CommandContext(ctx, "docker", "run", "-d",
			"--name", "spanel-sqlite-web",
			"--network", "spanel-net",
			"--restart", "unless-stopped",
			"-v", fmt.Sprintf("%s:/data", sqliteDir),
			"-p", "127.0.0.1:8085:8080",
			"-e", "SQLITE_DATABASE=/data/sqlite.db",
			"coleifer/sqlite-web",
			"sqlite.db",
		)
		_ = runWeb.Run()

	default:
		return nil, nil, fmt.Errorf("unsupported service: %s. Supported: postgresql, mysql, redis, sqlite", serviceName)
	}

	credsJSON, _ := json.Marshal(creds)
	encCreds, _ := crypto.Encrypt(string(credsJSON), m.cfg.MasterKey, "mkt:service:"+serviceName)

	// Save or update in database
	var svc db.MarketplaceService
	if err := m.db.First(&svc, "service_name = ?", serviceName).Error; err == nil {
		svc.ContainerID = containerName
		svc.InternalHostname = containerName
		svc.InternalPort = internalPort
		svc.CredentialsEncrypted = encCreds
		svc.VolumeHostPath = volumeHostPath
		svc.Status = "running"
		m.db.Save(&svc)
	} else {
		svc = db.MarketplaceService{
			UserID:               "default-admin",
			ServiceName:          serviceName,
			ContainerID:          containerName,
			InternalHostname:     containerName,
			InternalPort:         internalPort,
			CredentialsEncrypted: encCreds,
			VolumeHostPath:       volumeHostPath,
			Status:               "running",
		}
		m.db.Create(&svc)
	}

	return &svc, &creds, nil
}

// GetDecryptedCredentials returns decoded credentials for a marketplace service
func (m *DatabaseManager) GetDecryptedCredentials(svc *db.MarketplaceService) (*DBCredentials, error) {
	if svc.CredentialsEncrypted == "" {
		return nil, fmt.Errorf("no credentials found")
	}

	decrypted, err := crypto.Decrypt(svc.CredentialsEncrypted, m.cfg.MasterKey, "mkt:service:"+svc.ServiceName)
	if err != nil {
		return nil, err
	}

	var creds DBCredentials
	if err := json.Unmarshal([]byte(decrypted), &creds); err != nil {
		return nil, err
	}

	return &creds, nil
}

// AttachDatabaseToProject injects DATABASE_URL or REDIS_URL into the project's env vars
func (m *DatabaseManager) AttachDatabaseToProject(projectID string, serviceID string) (*DBCredentials, error) {
	var project db.Project
	if err := m.db.First(&project, "id = ?", projectID).Error; err != nil {
		return nil, fmt.Errorf("project %s not found: %w", projectID, err)
	}

	var service db.MarketplaceService
	if err := m.db.First(&service, "id = ?", serviceID).Error; err != nil {
		return nil, fmt.Errorf("service %s not found: %w", serviceID, err)
	}

	creds, err := m.GetDecryptedCredentials(&service)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve credentials: %w", err)
	}

	envKey := "DATABASE_URL"
	envVal := creds.InternalURI

	if service.ServiceName == "redis" {
		envKey = "REDIS_URL"
	}

	encVal, err := crypto.Encrypt(envVal, m.cfg.MasterKey, "env:"+project.ID+":"+envKey)
	if err != nil {
		return nil, fmt.Errorf("encryption error: %w", err)
	}

	// Upsert environment variable
	m.db.Where("project_id = ? AND key = ?", project.ID, envKey).Delete(&db.EnvironmentVariable{})
	envVar := db.EnvironmentVariable{
		ProjectID:        project.ID,
		Key:              envKey,
		ValueEncrypted:   encVal,
		IsSystemInjected: true,
	}
	m.db.Create(&envVar)

	// If SQLite, also attach volume mount to /data
	if service.ServiceName == "sqlite" {
		sqliteDir, _ := filepath.Abs(filepath.Join(m.cfg.DataDir, "sqlite"))
		m.db.Where("project_id = ? AND name = ?", project.ID, "sqlite-data").Delete(&db.Volume{})
		vol := db.Volume{
			ProjectID:     project.ID,
			Name:          "sqlite-data",
			ContainerPath: "/data",
			HostPath:      sqliteDir,
		}
		m.db.Create(&vol)

		// Also inject SQLITE_PATH
		encPath, _ := crypto.Encrypt("/data/sqlite.db", m.cfg.MasterKey, "env:"+project.ID+":SQLITE_PATH")
		m.db.Where("project_id = ? AND key = ?", project.ID, "SQLITE_PATH").Delete(&db.EnvironmentVariable{})
		m.db.Create(&db.EnvironmentVariable{
			ProjectID:        project.ID,
			Key:              "SQLITE_PATH",
			ValueEncrypted:   encPath,
			IsSystemInjected: true,
		})
	}

	return creds, nil
}

type BackupInfo struct {
	Filename  string    `json:"filename"`
	Size      int64     `json:"size"`
	CreatedAt time.Time `json:"created_at"`
	Service   string    `json:"service"`
}

func (m *DatabaseManager) BackupService(ctx context.Context, serviceID string) (*BackupInfo, error) {
	var svc db.MarketplaceService
	if err := m.db.First(&svc, "id = ?", serviceID).Error; err != nil {
		return nil, fmt.Errorf("service not found: %w", err)
	}

	creds, err := m.GetDecryptedCredentials(&svc)
	if err != nil {
		return nil, fmt.Errorf("failed to get credentials: %w", err)
	}

	backupDir := filepath.Join(m.cfg.DataDir, "backups", svc.ServiceName)
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create backup directory: %w", err)
	}

	timestamp := time.Now().Format("20060102_150405")
	var filename string
	var destPath string

	switch svc.ServiceName {
	case "postgresql", "postgres":
		filename = fmt.Sprintf("postgres_%s.sql", timestamp)
		destPath = filepath.Join(backupDir, filename)
		cmd := exec.CommandContext(ctx, "docker", "exec",
			"-e", fmt.Sprintf("PGPASSWORD=%s", creds.Password),
			svc.ContainerID,
			"pg_dump", "-U", creds.Username, "-d", creds.DatabaseName,
		)
		outFile, err := os.Create(destPath)
		if err != nil {
			return nil, fmt.Errorf("failed to create backup file: %w", err)
		}
		defer outFile.Close()
		cmd.Stdout = outFile
		if err := cmd.Run(); err != nil {
			return nil, fmt.Errorf("pg_dump failed: %w", err)
		}

	case "mysql":
		filename = fmt.Sprintf("mysql_%s.sql", timestamp)
		destPath = filepath.Join(backupDir, filename)
		cmd := exec.CommandContext(ctx, "docker", "exec",
			svc.ContainerID,
			"mysqldump", "-u", creds.Username, fmt.Sprintf("-p%s", creds.Password), creds.DatabaseName,
		)
		outFile, err := os.Create(destPath)
		if err != nil {
			return nil, fmt.Errorf("failed to create backup file: %w", err)
		}
		defer outFile.Close()
		cmd.Stdout = outFile
		if err := cmd.Run(); err != nil {
			return nil, fmt.Errorf("mysqldump failed: %w", err)
		}

	case "sqlite":
		filename = fmt.Sprintf("sqlite_%s.db", timestamp)
		destPath = filepath.Join(backupDir, filename)
		sqliteSrc := filepath.Join(m.cfg.DataDir, "sqlite", "sqlite.db")
		data, err := os.ReadFile(sqliteSrc)
		if err != nil {
			return nil, fmt.Errorf("failed to read sqlite source: %w", err)
		}
		if err := os.WriteFile(destPath, data, 0644); err != nil {
			return nil, fmt.Errorf("failed to write sqlite backup: %w", err)
		}

	case "redis":
		filename = fmt.Sprintf("redis_%s.rdb", timestamp)
		destPath = filepath.Join(backupDir, filename)
		_ = exec.CommandContext(ctx, "docker", "exec", svc.ContainerID, "redis-cli", "-a", creds.Password, "SAVE").Run()
		cmd := exec.CommandContext(ctx, "docker", "cp", fmt.Sprintf("%s:/data/dump.rdb", svc.ContainerID), destPath)
		if err := cmd.Run(); err != nil {
			return nil, fmt.Errorf("failed to copy redis dump: %w", err)
		}

	default:
		return nil, fmt.Errorf("backup not supported for service: %s", svc.ServiceName)
	}

	fi, err := os.Stat(destPath)
	if err != nil {
		return nil, fmt.Errorf("failed to stat backup file: %w", err)
	}

	return &BackupInfo{
		Filename:  filename,
		Size:      fi.Size(),
		CreatedAt: fi.ModTime(),
		Service:   svc.ServiceName,
	}, nil
}

func (m *DatabaseManager) ListBackups(serviceID string) ([]BackupInfo, error) {
	var svc db.MarketplaceService
	if err := m.db.First(&svc, "id = ?", serviceID).Error; err != nil {
		return nil, fmt.Errorf("service not found: %w", err)
	}

	backupDir := filepath.Join(m.cfg.DataDir, "backups", svc.ServiceName)
	entries, err := os.ReadDir(backupDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []BackupInfo{}, nil
		}
		return nil, err
	}

	var results []BackupInfo
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		results = append(results, BackupInfo{
			Filename:  entry.Name(),
			Size:      info.Size(),
			CreatedAt: info.ModTime(),
			Service:   svc.ServiceName,
		})
	}
	return results, nil
}

func (m *DatabaseManager) RestoreBackup(ctx context.Context, serviceID string, filename string) error {
	var svc db.MarketplaceService
	if err := m.db.First(&svc, "id = ?", serviceID).Error; err != nil {
		return fmt.Errorf("service not found: %w", err)
	}

	creds, err := m.GetDecryptedCredentials(&svc)
	if err != nil {
		return fmt.Errorf("failed to get credentials: %w", err)
	}

	cleanFilename := filepath.Base(filename)
	backupPath := filepath.Join(m.cfg.DataDir, "backups", svc.ServiceName, cleanFilename)
	if _, err := os.Stat(backupPath); err != nil {
		return fmt.Errorf("backup file not found: %w", err)
	}

	switch svc.ServiceName {
	case "postgresql", "postgres":
		inFile, err := os.Open(backupPath)
		if err != nil {
			return err
		}
		defer inFile.Close()
		cmd := exec.CommandContext(ctx, "docker", "exec", "-i",
			"-e", fmt.Sprintf("PGPASSWORD=%s", creds.Password),
			svc.ContainerID,
			"psql", "-U", creds.Username, "-d", creds.DatabaseName,
		)
		cmd.Stdin = inFile
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("psql restore failed: %w (%s)", err, string(out))
		}

	case "mysql":
		inFile, err := os.Open(backupPath)
		if err != nil {
			return err
		}
		defer inFile.Close()
		cmd := exec.CommandContext(ctx, "docker", "exec", "-i",
			svc.ContainerID,
			"mysql", "-u", creds.Username, fmt.Sprintf("-p%s", creds.Password), creds.DatabaseName,
		)
		cmd.Stdin = inFile
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("mysql restore failed: %w (%s)", err, string(out))
		}

	case "sqlite":
		data, err := os.ReadFile(backupPath)
		if err != nil {
			return err
		}
		dest := filepath.Join(m.cfg.DataDir, "sqlite", "sqlite.db")
		if err := os.WriteFile(dest, data, 0644); err != nil {
			return err
		}

	case "redis":
		cmd := exec.CommandContext(ctx, "docker", "cp", backupPath, fmt.Sprintf("%s:/data/dump.rdb", svc.ContainerID))
		if err := cmd.Run(); err != nil {
			return err
		}
		_ = exec.CommandContext(ctx, "docker", "restart", svc.ContainerID).Run()

	default:
		return fmt.Errorf("restore not supported for: %s", svc.ServiceName)
	}

	return nil
}

