package service

import (
	"context"
	"os/exec"
	"strings"
)

// EnsureTraefikRunning launches or connects the Traefik container on port 80 to route *.sslip.io domains
func EnsureTraefikRunning(ctx context.Context, writeLog func(string, ...interface{})) {
	_ = exec.CommandContext(ctx, "docker", "network", "create", "spanel-net").Run()

	// Check if spanel-traefik is already running
	cmdCheck := exec.CommandContext(ctx, "docker", "ps", "--filter", "name=spanel-traefik", "--format", "{{.Names}}")
	out, err := cmdCheck.CombinedOutput()
	if err == nil && strings.Contains(string(out), "spanel-traefik") {
		_ = exec.CommandContext(ctx, "docker", "network", "connect", "spanel-net", "spanel-traefik").Run()
		writeLog("✓ Traefik reverse proxy is already running on port 80 (network: spanel-net)")
		return
	}

	writeLog("Starting Traefik reverse proxy on port 80...")
	_ = exec.CommandContext(ctx, "docker", "rm", "-f", "spanel-traefik").Run()

	runTraefik := exec.CommandContext(ctx, "docker", "run", "-d",
		"--name", "spanel-traefik",
		"--restart", "always",
		"--network", "spanel-net",
		"-p", "80:80",
		"-v", "/var/run/docker.sock:/var/run/docker.sock",
		"traefik:v3.1",
		"--providers.docker=true",
		"--providers.docker.exposedbydefault=false",
		"--providers.docker.network=spanel-net",
		"--entrypoints.web.address=:80",
	)

	if tOut, tErr := runTraefik.CombinedOutput(); tErr != nil {
		writeLog("[WARNING] Could not start Traefik on port 80: %v (%s). App will still be available on direct port!", tErr, string(tOut))
	} else {
		writeLog("✓ Traefik reverse proxy launched successfully on port 80!")
	}
}
