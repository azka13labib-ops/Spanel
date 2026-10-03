package config

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
	"path/filepath"
)

type Config struct {
	Port         string
	DataDir      string
	DatabasePath string
	MasterKey    string
	HostIP       string
}

var AppConfig *Config

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}
	_ = os.MkdirAll(dataDir, 0755)

	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = filepath.Join(dataDir, "panel.db")
	}

	masterKey := os.Getenv("SPANEL_MASTER_KEY")
	if masterKey == "" {
		// In production, user should set SPANEL_MASTER_KEY.
		// For first-time/dev bootstrap, generate or load a local key file.
		keyFile := filepath.Join(dataDir, "master.key")
		if data, err := os.ReadFile(keyFile); err == nil && len(data) > 0 {
			masterKey = string(data)
		} else {
			bytes := make([]byte, 32) // 256 bits
			if _, err := rand.Read(bytes); err != nil {
				log.Fatalf("Failed to generate master key: %v", err)
			}
			masterKey = hex.EncodeToString(bytes)
			_ = os.WriteFile(keyFile, []byte(masterKey), 0600)
			log.Printf("[SECURITY] Generated new master key saved to %s", keyFile)
		}
	}

	hostIP := os.Getenv("HOST_IP")
	if hostIP == "" {
		hostIP = "127.0.0.1"
	}

	AppConfig = &Config{
		Port:         port,
		DataDir:      dataDir,
		DatabasePath: dbPath,
		MasterKey:    masterKey,
		HostIP:       hostIP,
	}

	return AppConfig
}
