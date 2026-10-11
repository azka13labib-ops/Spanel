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

type ProvisionDatabaseOptions struct {
	ServiceName     string `json:"service_name"`
	CustomName      string `json:"custom_name"`
	DatabaseName    string `json:"database_name"`
	Username        string `json:"username"`
	Password        string `json:"password"`
	ExposeHostPort  bool   `json:"expose_host_port"`
	HostPort        int    `json:"host_port"`
	AttachProjectID string `json:"attach_project_id"`
}

func (m *DatabaseManager) ProvisionDatabase(ctx context.Context, serviceName string) (*db.MarketplaceService, *DBCredentials, error) {
	return m.ProvisionDatabaseWithOptions(ctx, ProvisionDatabaseOptions{ServiceName: serviceName})
}

func (m *DatabaseManager) ProvisionDatabaseWithOptions(ctx context.Context, opts ProvisionDatabaseOptions) (*db.MarketplaceService, *DBCredentials, error) {
	serviceName := strings.ToLower(strings.TrimSpace(opts.ServiceName))

	_ = exec.CommandContext(ctx, "docker", "network", "create", "spanel-net").Run()

	var creds DBCredentials
	var containerName string
	var internalPort int
	var volumeHostPath string
	var engineVersion string
	var displayName string

	// Clean custom name if provided
	if opts.CustomName != "" {
		clean := strings.ToLower(strings.TrimSpace(opts.CustomName))
		var sb strings.Builder
		for _, r := range clean {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
				sb.WriteRune(r)
			} else {
				sb.WriteRune('-')
			}
		}
		cleanStr := strings.Trim(sb.String(), "-_")
		if cleanStr != "" {
			displayName = opts.CustomName
			if !strings.HasPrefix(cleanStr, "spanel-") {
				containerName = "spanel-" + cleanStr
			} else {
				containerName = cleanStr
			}
		}
	}

	switch serviceName {
	case "postgresql", "postgres":
		serviceName = "postgresql"
		engineVersion = "16-alpine"
		if displayName == "" {
			displayName = "PostgreSQL 16"
		}
		if containerName == "" {
			containerName = "spanel-postgres"
		}
		internalPort = 5432

		dbUser := "spanel"
		if strings.TrimSpace(opts.Username) != "" {
			dbUser = strings.TrimSpace(opts.Username)
		}
		dbPass := randomString(24)
		if strings.TrimSpace(opts.Password) != "" {
			dbPass = strings.TrimSpace(opts.Password)
		}
		dbName := "spanel_db"
		if strings.TrimSpace(opts.DatabaseName) != "" {
			dbName = strings.TrimSpace(opts.DatabaseName)
		}

		hostPort := opts.HostPort
		if hostPort <= 0 {
			hostPort = 5432
		}

		externalURI := "Port not exposed externally (Accessible within spanel-net network)"
		if opts.ExposeHostPort {
			externalURI = fmt.Sprintf("postgres://%s:%s@localhost:%d/%s?sslmode=disable", dbUser, dbPass, hostPort, dbName)
		}

		creds = DBCredentials{
			ServiceName:  "postgresql",
			Username:     dbUser,
			Password:     dbPass,
			DatabaseName: dbName,
			Port:         5432,
			Host:         containerName,
			InternalURI:  fmt.Sprintf("postgres://%s:%s@%s:5432/%s?sslmode=disable", dbUser, dbPass, containerName, dbName),
			ExternalURI:  externalURI,
		}

		volumeName := fmt.Sprintf("spanel-vol-%s", containerName)
		_ = exec.CommandContext(ctx, "docker", "volume", "create", volumeName).Run()
		_ = exec.CommandContext(ctx, "docker", "rm", "-f", containerName).Run()

		runArgs := []string{
			"run", "-d",
			"--name", containerName,
			"--network", "spanel-net",
			"--restart", "unless-stopped",
			"-v", fmt.Sprintf("%s:/var/lib/postgresql/data", volumeName),
			"-e", fmt.Sprintf("POSTGRES_USER=%s", dbUser),
			"-e", fmt.Sprintf("POSTGRES_PASSWORD=%s", dbPass),
			"-e", fmt.Sprintf("POSTGRES_DB=%s", dbName),
		}
		if opts.ExposeHostPort {
			runArgs = append(runArgs, "-p", fmt.Sprintf("127.0.0.1:%d:5432", hostPort))
		}
		runArgs = append(runArgs, "postgres:16-alpine")

		cmd := exec.CommandContext(ctx, "docker", runArgs...)
		if out, err := cmd.CombinedOutput(); err != nil {
			return nil, nil, fmt.Errorf("failed to run postgres container: %w (%s)", err, string(out))
		}
		volumeHostPath = volumeName

	case "mysql":
		serviceName = "mysql"
		engineVersion = "8.0"
		if displayName == "" {
			displayName = "MySQL 8.0"
		}
		if containerName == "" {
			containerName = "spanel-mysql"
		}
		internalPort = 3306

		dbUser := "spanel"
		if strings.TrimSpace(opts.Username) != "" {
			dbUser = strings.TrimSpace(opts.Username)
		}
		dbPass := randomString(24)
		if strings.TrimSpace(opts.Password) != "" {
			dbPass = strings.TrimSpace(opts.Password)
		}
		dbName := "spanel_db"
		if strings.TrimSpace(opts.DatabaseName) != "" {
			dbName = strings.TrimSpace(opts.DatabaseName)
		}

		hostPort := opts.HostPort
		if hostPort <= 0 {
			hostPort = 3306
		}

		externalURI := "Port not exposed externally (Accessible within spanel-net network)"
		if opts.ExposeHostPort {
			externalURI = fmt.Sprintf("mysql://%s:%s@tcp(localhost:%d)/%s", dbUser, dbPass, hostPort, dbName)
		}

		creds = DBCredentials{
			ServiceName:  "mysql",
			Username:     dbUser,
			Password:     dbPass,
			DatabaseName: dbName,
			Port:         3306,
			Host:         containerName,
			InternalURI:  fmt.Sprintf("mysql://%s:%s@tcp(%s:3306)/%s", dbUser, dbPass, containerName, dbName),
			ExternalURI:  externalURI,
		}

		volumeName := fmt.Sprintf("spanel-vol-%s", containerName)
		_ = exec.CommandContext(ctx, "docker", "volume", "create", volumeName).Run()
		_ = exec.CommandContext(ctx, "docker", "rm", "-f", containerName).Run()

		runArgs := []string{
			"run", "-d",
			"--name", containerName,
			"--network", "spanel-net",
			"--restart", "unless-stopped",
			"-v", fmt.Sprintf("%s:/var/lib/mysql", volumeName),
			"-e", fmt.Sprintf("MYSQL_USER=%s", dbUser),
			"-e", fmt.Sprintf("MYSQL_PASSWORD=%s", dbPass),
			"-e", fmt.Sprintf("MYSQL_DATABASE=%s", dbName),
			"-e", fmt.Sprintf("MYSQL_ROOT_PASSWORD=%s", dbPass),
		}
		if opts.ExposeHostPort {
			runArgs = append(runArgs, "-p", fmt.Sprintf("127.0.0.1:%d:3306", hostPort))
		}
		runArgs = append(runArgs, "mysql:8.0")

		cmd := exec.CommandContext(ctx, "docker", runArgs...)
		if out, err := cmd.CombinedOutput(); err != nil {
			return nil, nil, fmt.Errorf("failed to run mysql container: %w (%s)", err, string(out))
		}
		volumeHostPath = volumeName

	case "redis":
		serviceName = "redis"
		engineVersion = "7.2-alpine"
		if displayName == "" {
			displayName = "Redis 7.2"
		}
		if containerName == "" {
			containerName = "spanel-redis"
		}
		internalPort = 6379

		dbPass := randomString(24)
		if strings.TrimSpace(opts.Password) != "" {
			dbPass = strings.TrimSpace(opts.Password)
		}

		hostPort := opts.HostPort
		if hostPort <= 0 {
			hostPort = 6379
		}

		externalURI := "Port not exposed externally (Accessible within spanel-net network)"
		if opts.ExposeHostPort {
			externalURI = fmt.Sprintf("redis://:%s@localhost:%d/0", dbPass, hostPort)
		}

		creds = DBCredentials{
			ServiceName:  "redis",
			Username:     "default",
			Password:     dbPass,
			DatabaseName: "0",
			Port:         6379,
			Host:         containerName,
			InternalURI:  fmt.Sprintf("redis://:%s@%s:6379/0", dbPass, containerName),
			ExternalURI:  externalURI,
		}

		volumeName := fmt.Sprintf("spanel-vol-%s", containerName)
		_ = exec.CommandContext(ctx, "docker", "volume", "create", volumeName).Run()
		_ = exec.CommandContext(ctx, "docker", "rm", "-f", containerName).Run()

		runArgs := []string{
			"run", "-d",
			"--name", containerName,
			"--network", "spanel-net",
			"--restart", "unless-stopped",
			"-v", fmt.Sprintf("%s:/data", volumeName),
		}
		if opts.ExposeHostPort {
			runArgs = append(runArgs, "-p", fmt.Sprintf("127.0.0.1:%d:6379", hostPort))
		}
		runArgs = append(runArgs, "redis:7.2-alpine", "redis-server", "--requirepass", dbPass)

		cmd := exec.CommandContext(ctx, "docker", runArgs...)
		if out, err := cmd.CombinedOutput(); err != nil {
			return nil, nil, fmt.Errorf("failed to run redis container: %w (%s)", err, string(out))
		}
		volumeHostPath = volumeName

	case "sqlite", "sqlite3":
		serviceName = "sqlite"
		engineVersion = "3.x (Embedded)"
		if displayName == "" {
			displayName = "SQLite 3 (Embedded)"
		}
		containerName = "spanel-sqlite"
		internalPort = 0 // SQLite is an embedded database, not a network server

		sqliteDir, _ := filepath.Abs(filepath.Join(m.cfg.DataDir, "sqlite"))
		_ = os.MkdirAll(sqliteDir, 0755)
		dbFilePath := filepath.Join(sqliteDir, "sqlite.db")

		if sdb, err := sql.Open("sqlite3", dbFilePath); err == nil {
			_, _ = sdb.Exec("PRAGMA journal_mode=WAL;")
			sdb.Close()
		}

		creds = DBCredentials{
			ServiceName:  "sqlite",
			Username:     "sqlite",
			Password:     "-",
			DatabaseName: "sqlite.db",
			Port:         0,
			Host:         "embedded",
			InternalURI:  "file:/data/sqlite.db",
			ExternalURI:  fmt.Sprintf("File on host: %s", dbFilePath),
		}
		volumeHostPath = sqliteDir

	default:
		return nil, nil, fmt.Errorf("unsupported service: %s. Supported: postgresql, mysql, redis, sqlite", serviceName)
	}

	credsJSON, _ := json.Marshal(creds)
	encCreds, _ := crypto.Encrypt(string(credsJSON), m.cfg.MasterKey, "mkt:service:"+serviceName)

	var svc db.MarketplaceService
	if err := m.db.First(&svc, "service_name = ?", serviceName).Error; err == nil {
		svc.DisplayName = displayName
		svc.EngineVersion = engineVersion
		svc.ContainerID = containerName
		svc.InternalHostname = containerName
		svc.InternalPort = internalPort
		svc.CredentialsEncrypted = encCreds
		svc.VolumeHostPath = volumeHostPath
		svc.ExposeHostPort = opts.ExposeHostPort
		svc.HostPort = opts.HostPort
		svc.Status = "running"
		m.db.Save(&svc)
	} else {
		svc = db.MarketplaceService{
			UserID:               "default-admin",
			ServiceName:          serviceName,
			DisplayName:          displayName,
			EngineVersion:        engineVersion,
			ContainerID:          containerName,
			InternalHostname:     containerName,
			InternalPort:         internalPort,
			CredentialsEncrypted: encCreds,
			VolumeHostPath:       volumeHostPath,
			ExposeHostPort:       opts.ExposeHostPort,
			HostPort:             opts.HostPort,
			Status:               "running",
		}
		m.db.Create(&svc)
	}

	if opts.AttachProjectID != "" {
		_, _ = m.AttachDatabaseToProject(opts.AttachProjectID, svc.ID)
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

func (m *DatabaseManager) upsertInjectedEnv(projectID, key, val string, isSecret bool) error {
	encVal, err := crypto.Encrypt(val, m.cfg.MasterKey, "env:"+projectID+":"+key)
	if err != nil {
		return err
	}
	m.db.Where("project_id = ? AND key = ?", projectID, key).Delete(&db.EnvironmentVariable{})
	return m.db.Select("*").Create(&db.EnvironmentVariable{
		ProjectID:        projectID,
		Key:              key,
		ValueEncrypted:   encVal,
		IsSystemInjected: true,
		Scope:            db.ScopeRuntime,
		IsSecret:         isSecret,
	}).Error
}

// AttachDatabaseToProject injects complete framework (Laravel, Rails, Node, Go) environment variables into the project
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

	switch service.ServiceName {
	case "postgresql", "postgres":
		_ = m.upsertInjectedEnv(project.ID, "DATABASE_URL", creds.InternalURI, true)
		_ = m.upsertInjectedEnv(project.ID, "DB_CONNECTION", "pgsql", false)
		_ = m.upsertInjectedEnv(project.ID, "DB_HOST", creds.Host, false)
		_ = m.upsertInjectedEnv(project.ID, "DB_PORT", fmt.Sprintf("%d", creds.Port), false)
		_ = m.upsertInjectedEnv(project.ID, "DB_DATABASE", creds.DatabaseName, false)
		_ = m.upsertInjectedEnv(project.ID, "DB_USERNAME", creds.Username, false)
		_ = m.upsertInjectedEnv(project.ID, "DB_PASSWORD", creds.Password, true)

	case "mysql":
		_ = m.upsertInjectedEnv(project.ID, "DATABASE_URL", creds.InternalURI, true)
		_ = m.upsertInjectedEnv(project.ID, "DB_CONNECTION", "mysql", false)
		_ = m.upsertInjectedEnv(project.ID, "DB_HOST", creds.Host, false)
		_ = m.upsertInjectedEnv(project.ID, "DB_PORT", fmt.Sprintf("%d", creds.Port), false)
		_ = m.upsertInjectedEnv(project.ID, "DB_DATABASE", creds.DatabaseName, false)
		_ = m.upsertInjectedEnv(project.ID, "DB_USERNAME", creds.Username, false)
		_ = m.upsertInjectedEnv(project.ID, "DB_PASSWORD", creds.Password, true)

	case "redis":
		_ = m.upsertInjectedEnv(project.ID, "REDIS_URL", creds.InternalURI, true)
		_ = m.upsertInjectedEnv(project.ID, "REDIS_HOST", creds.Host, false)
		_ = m.upsertInjectedEnv(project.ID, "REDIS_PORT", fmt.Sprintf("%d", creds.Port), false)
		_ = m.upsertInjectedEnv(project.ID, "REDIS_PASSWORD", creds.Password, true)

	case "sqlite":
		_ = m.upsertInjectedEnv(project.ID, "DB_CONNECTION", "sqlite", false)
		_ = m.upsertInjectedEnv(project.ID, "DB_DATABASE", "/data/sqlite.db", false)
		_ = m.upsertInjectedEnv(project.ID, "SQLITE_PATH", "/data/sqlite.db", false)
		_ = m.upsertInjectedEnv(project.ID, "DATABASE_URL", "file:/data/sqlite.db", false)

		sqliteDir, _ := filepath.Abs(filepath.Join(m.cfg.DataDir, "sqlite"))
		m.db.Where("project_id = ? AND name = ?", project.ID, "sqlite-data").Delete(&db.Volume{})
		vol := db.Volume{
			ProjectID:     project.ID,
			Name:          "sqlite-data",
			ContainerPath: "/data",
			HostPath:      sqliteDir,
		}
		m.db.Create(&vol)
	}

	return creds, nil
}

func (m *DatabaseManager) RestartService(ctx context.Context, serviceID string) error {
	var svc db.MarketplaceService
	if err := m.db.First(&svc, "id = ?", serviceID).Error; err != nil {
		return fmt.Errorf("service not found: %w", err)
	}
	if svc.ContainerID == "" {
		return fmt.Errorf("no container found for service")
	}
	if err := exec.CommandContext(ctx, "docker", "restart", svc.ContainerID).Run(); err != nil {
		return fmt.Errorf("failed to restart container: %w", err)
	}
	return nil
}

func (m *DatabaseManager) GetRealContainerStatus(ctx context.Context, containerID string) string {
	if containerID == "" {
		return "stopped"
	}
	cmd := exec.CommandContext(ctx, "docker", "inspect", "--format", "{{.State.Status}}", containerID)
	out, err := cmd.Output()
	if err != nil {
		return "stopped"
	}
	st := strings.TrimSpace(string(out))
	if st == "" {
		return "stopped"
	}
	return st
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

