package api

import (
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"spanel/internal/config"

	fiber "github.com/gofiber/fiber/v2"
)

// handleHealth returns server health status and version info
func (s *Server) handleHealth(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":    "healthy",
		"service":   "spanel-server",
		"version":   config.Version,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func getHostMemory() (totalMB, usedMB, freeMB uint64, usagePercent float64) {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return 0, 0, 0, 0
	}
	var memTotal, memAvailable uint64
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) >= 2 {
			switch fields[0] {
			case "MemTotal:":
				val, _ := strconv.ParseUint(fields[1], 10, 64)
				memTotal = val / 1024 // KB to MB
			case "MemAvailable:":
				val, _ := strconv.ParseUint(fields[1], 10, 64)
				memAvailable = val / 1024
			}
		}
	}
	if memTotal > 0 {
		var used uint64
		if memTotal >= memAvailable {
			used = memTotal - memAvailable
		}
		pct := (float64(used) / float64(memTotal)) * 100.0
		return memTotal, used, memAvailable, pct
	}
	return 0, 0, 0, 0
}

func getHostCPU() (cpuPercent float64, load1 float64) {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return 0, 0
	}
	fields := strings.Fields(string(data))
	if len(fields) > 0 {
		if l, err := strconv.ParseFloat(fields[0], 64); err == nil {
			load1 = l
			numCPU := float64(runtime.NumCPU())
			if numCPU > 0 {
				pct := (load1 / numCPU) * 100.0
				if pct > 100.0 {
					pct = 100.0
				}
				cpuPercent = pct
			}
		}
	}
	return cpuPercent, load1
}

// handleSystemMetrics returns OS, CPU, RAM, and runtime stats
func (s *Server) handleSystemMetrics(c *fiber.Ctx) error {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	totalRAM, usedRAM, freeRAM, ramPct := getHostMemory()
	cpuPct, load1 := getHostCPU()

	return c.JSON(fiber.Map{
		"os":                runtime.GOOS,
		"arch":              runtime.GOARCH,
		"num_cpu":           runtime.NumCPU(),
		"alloc_mb":          mem.Alloc / 1024 / 1024,
		"total_mb":          mem.TotalAlloc / 1024 / 1024,
		"sys_mb":            mem.Sys / 1024 / 1024,
		"goroutines":        runtime.NumGoroutine(),
		"host_ip":           s.cfg.HostIP,
		"host_total_ram_mb": totalRAM,
		"host_used_ram_mb":  usedRAM,
		"host_free_ram_mb":  freeRAM,
		"host_ram_percent":  ramPct,
		"host_cpu_percent":  cpuPct,
		"load_avg_1":        load1,
	})
}

// handleGetVersion returns the current and latest version info
func (s *Server) handleGetVersion(c *fiber.Ctx) error {
	info, err := s.updater.CheckUpdate(false)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(info)
}

// handleCheckUpdate forces an immediate check against GitHub Releases
func (s *Server) handleCheckUpdate(c *fiber.Ctx) error {
	info, err := s.updater.CheckUpdate(true)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(info)
}

// handleSelfUpdate initiates the 1-click self-update process
func (s *Server) handleSelfUpdate(c *fiber.Ctx) error {
	if err := s.updater.PerformSelfUpdate(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "Update downloaded and verified. Restarting sPanel service...",
	})
}
