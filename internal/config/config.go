package config

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net"
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

func isPrivateOrVPNIPString(ipStr string) bool {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return false
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() {
		return true
	}
	if ip4 := ip.To4(); ip4 != nil {
		if ip4[0] == 100 && (ip4[1]&0xC0) == 64 {
			return true
		}
	}
	return false
}

func loadEnvFile(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.TrimSpace(parts[1])
			v = strings.Trim(v, `"'`)
			if os.Getenv(k) == "" {
				os.Setenv(k, v)
			}
		}
	}
}

func Load() *Config {
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}
	_ = os.MkdirAll(dataDir, 0755)

	loadEnvFile(".env")
	loadEnvFile(filepath.Join(dataDir, ".env"))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

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

	// Deliberate private-network HTTP mode or automatically permitted on private/Tailscale IP
	allowInsecureHTTP := os.Getenv("SPANEL_ALLOW_INSECURE_HTTP") == "true" ||
		os.Getenv("SPANEL_PRIVATE_NETWORK_MODE") == "true" ||
		(env != "production") ||
		isPrivateOrVPNIPString(hostIP)

	if allowInsecureHTTP && env == "production" {
		log.Println("[INFO] Private-network HTTP mode is active (unencrypted HTTP permitted for private/Tailscale networks).")
	}

	// CookieSecure defaults to true in production unless insecure HTTP is opted into or host is private
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

