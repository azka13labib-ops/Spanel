package config

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Port              string
	DataDir           string
	DatabasePath      string
	MasterKey         string
	HostIP            string
	Env               string
	CookieSecure      bool
	AllowInsecureHTTP bool
	TrustedProxies    []string
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
		keyFile := filepath.Join(dataDir, "master.key")
		if data, err := os.ReadFile(keyFile); err == nil && len(data) > 0 {
			masterKey = string(data)
		} else {
			bytes := make([]byte, 32)	
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

	env := os.Getenv("SPANEL_ENV")
	if env == "" {
		env = os.Getenv("NODE_ENV")
	}
	if env == "" {
		env = "production"
	}

	// Deliberate private-network HTTP mode must be explicitly configured
	allowInsecureHTTP := os.Getenv("SPANEL_ALLOW_INSECURE_HTTP") == "true" ||
		os.Getenv("SPANEL_PRIVATE_NETWORK_MODE") == "true" ||
		(env != "production")

	if env == "production" && allowInsecureHTTP {
		log.Println("[SECURITY WARNING] Deliberate private-network HTTP mode is enabled (SPANEL_ALLOW_INSECURE_HTTP=true). Unencrypted HTTP traffic is permitted.")
	}

	// CookieSecure defaults to true in production unless insecure HTTP is explicitly opted into
	var cookieSecure bool
	if val := os.Getenv("SPANEL_COOKIE_SECURE"); val != "" {
		cookieSecure = val == "true"
	} else {
		cookieSecure = (env == "production" && !allowInsecureHTTP)
	}

	trustedProxiesRaw := os.Getenv("SPANEL_TRUSTED_PROXIES")
	var trustedProxies []string
	if trustedProxiesRaw != "" {
		for _, p := range strings.Split(trustedProxiesRaw, ",") {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				trustedProxies = append(trustedProxies, trimmed)
			}
		}
	} else {
		// Default to loopback reverse proxies only (e.g. local Nginx / Caddy)
		trustedProxies = []string{"127.0.0.1", "::1"}
	}

	AppConfig = &Config{
		Port:              port,
		DataDir:           dataDir,
		DatabasePath:      dbPath,
		MasterKey:         masterKey,
		HostIP:            hostIP,
		Env:               env,
		CookieSecure:      cookieSecure,
		AllowInsecureHTTP: allowInsecureHTTP,
		TrustedProxies:    trustedProxies,
	}

	return AppConfig
}

