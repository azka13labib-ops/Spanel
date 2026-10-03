package api

import (
	"runtime"
	"time"

	fiber "github.com/gofiber/fiber/v2"
)

// handleHealth returns server health status and version info
func (s *Server) handleHealth(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":    "healthy",
		"service":   "spanel-server",
		"version":   "1.0.0",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// handleSystemMetrics returns OS, CPU, RAM, and runtime stats
func (s *Server) handleSystemMetrics(c *fiber.Ctx) error {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	return c.JSON(fiber.Map{
		"os":         runtime.GOOS,
		"arch":       runtime.GOARCH,
		"num_cpu":    runtime.NumCPU(),
		"alloc_mb":   mem.Alloc / 1024 / 1024,
		"total_mb":   mem.TotalAlloc / 1024 / 1024,
		"sys_mb":     mem.Sys / 1024 / 1024,
		"goroutines": runtime.NumGoroutine(),
		"host_ip":    s.cfg.HostIP,
	})
}
