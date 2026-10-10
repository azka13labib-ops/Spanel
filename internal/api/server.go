package api

import (
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"strings"

	fiber "github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	websocket "github.com/gofiber/websocket/v2"
	"gorm.io/gorm"

	"spanel/internal/ai"
	"spanel/internal/config"
	"spanel/internal/queue"
	"spanel/internal/service"
	"spanel/internal/updater"
)

type Server struct {
	app        *fiber.App
	db         *gorm.DB
	queue      *queue.Queue
	cfg        *config.Config
	embeddedFS fs.FS
	dbManager  *service.DatabaseManager
	aiAgent    *ai.AIAgent
	updater    *updater.Updater
}

func NewServer(database *gorm.DB, q *queue.Queue, cfg *config.Config, embeddedFS fs.FS, aiAgent *ai.AIAgent) *Server {
	if aiAgent == nil {
		aiAgent = ai.NewAIAgent()
	}
	app := fiber.New(fiber.Config{
		AppName:               "sPanel v1.0 (Zero-Config PaaS)",
		DisableStartupMessage: false,
		ReadBufferSize:        32 * 1024, // 32KB buffer to handle large browser/localhost cookies
		WriteBufferSize:       32 * 1024,
	})

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	s := &Server{
		app:        app,
		db:         database,
		queue:      q,
		cfg:        cfg,
		embeddedFS: embeddedFS,
		dbManager:  service.NewDatabaseManager(database, cfg),
		aiAgent:    aiAgent,
		updater:    updater.NewUpdater("azka13labib-ops", "Spanel"),
	}

	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	// API Group
	apiGroup := s.app.Group("/api", s.requireAuth())

	// System Health & Info & Setup & Auth
	apiGroup.Get("/health", s.handleHealth)
	apiGroup.Post("/setup", s.handleSetup)
	apiGroup.Post("/auth/login", s.handleLogin)
	apiGroup.Post("/auth/logout", s.handleLogout)
	apiGroup.Get("/auth/me", s.handleGetMe)
	apiGroup.Get("/containers", s.handleListContainers)
	apiGroup.Get("/system/metrics", s.handleSystemMetrics)
	apiGroup.Get("/system/version", s.handleGetVersion)
	apiGroup.Post("/system/check-update", s.handleCheckUpdate)
	apiGroup.Post("/system/self-update", s.handleSelfUpdate)

	// Projects
	apiGroup.Get("/projects", s.handleListProjects)
	apiGroup.Post("/projects", s.handleCreateProject)
	apiGroup.Get("/projects/:id", s.handleGetProject)
	apiGroup.Delete("/projects/:id", s.handleDeleteProject)
	apiGroup.Put("/projects/:id", s.handleUpdateProject)
	apiGroup.Post("/projects/:id/domain", s.handleSetProjectDomain)
	apiGroup.Get("/projects/:id/domain-verify", s.handleVerifyProjectDomain)
	apiGroup.Post("/projects/:id/deploy", s.handleTriggerDeploy)
	apiGroup.Post("/projects/:id/rollback", s.handleTriggerRollback)
	apiGroup.Post("/projects/:id/start", s.handleStartProject)
	apiGroup.Post("/projects/:id/stop", s.handleStopProject)
	apiGroup.Post("/projects/:id/restart", s.handleRestartProject)
	apiGroup.Post("/projects/:id/attach-db", s.handleAttachDatabase)
	apiGroup.Get("/projects/:id/env", s.handleListProjectEnvVars)
	apiGroup.Get("/projects/:id/env/:envId/reveal", s.handleRevealProjectEnvVar)
	apiGroup.Post("/projects/:id/env", s.handleSetProjectEnvVar)
	apiGroup.Post("/projects/:id/env/bulk", s.handleBulkSetProjectEnvVars)
	apiGroup.Delete("/projects/:id/env/:envId", s.handleDeleteProjectEnvVar)

	apiGroup.Get("/deployments/:id", s.handleGetDeployment)
	apiGroup.Get("/deployments/:id/logs", s.handleGetDeploymentLogs)

	apiGroup.Post("/webhooks/github", s.handleGitHubWebhook)
	apiGroup.Post("/projects/:id/webhook", s.handleProjectWebhook)

	apiGroup.Get("/marketplace", s.handleListMarketplace)
	apiGroup.Post("/marketplace/install", s.handleInstallMarketplaceService)
	apiGroup.Get("/marketplace/:id/credentials", s.handleGetMarketplaceCredentials)
	apiGroup.Delete("/marketplace/:id", s.handleDeleteMarketplaceService)
	apiGroup.Post("/marketplace/:id/backup", s.handleBackupMarketplaceService)
	apiGroup.Get("/marketplace/:id/backups", s.handleListMarketplaceBackups)
	apiGroup.Post("/marketplace/:id/restore", s.handleRestoreMarketplaceBackup)

	// AI Configuration & Remediation
	apiGroup.Get("/ai/config", s.handleGetAIConfig)
	apiGroup.Post("/ai/config", s.handleSaveAIConfig)
	apiGroup.Delete("/ai/config", s.handleDeleteAIConfig)
	apiGroup.Post("/ai/test", s.handleTestAIConfig)
	apiGroup.Get("/remediations/:id", s.handleGetRemediation)
	apiGroup.Post("/remediations/:id/apply", s.handleApplyRemediation)

	// Cloudflare DNS Management
	apiGroup.Get("/dns/config", s.handleGetDNSConfig)
	apiGroup.Post("/dns/config", s.handleSaveDNSConfig)
	apiGroup.Delete("/dns/config", s.handleDeleteDNSConfig)
	apiGroup.Get("/dns/zones", s.handleListDNSZones)
	apiGroup.Get("/dns/zones/:zoneId/records", s.handleListDNSRecords)
	apiGroup.Post("/dns/zones/:zoneId/records", s.handleCreateDNSRecord)
	apiGroup.Delete("/dns/zones/:zoneId/records/:recordId", s.handleDeleteDNSRecord)
	apiGroup.Post("/dns/zones/:zoneId/quick-point", s.handleQuickPointDNSRecord)

	apiGroup.Get("/github/status", s.handleGitHubStatus)
	apiGroup.Post("/github/connect", s.handleGitHubConnect)
	apiGroup.Post("/github/disconnect", s.handleGitHubDisconnect)
	apiGroup.Get("/github/repos", s.handleGitHubListRepos)
	apiGroup.Get("/github/repos/:owner/:repo/branches", s.handleGitHubListBranches)

	s.app.Use("/ws", s.requireAuth(), s.requireSameOrigin(), func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	s.app.Get("/ws/logs/:deploymentId", websocket.New(s.handleLogStreamWebSocket))
	s.app.Get("/ws/runtime-logs/:projectId", websocket.New(s.handleRuntimeLogStreamWebSocket))
	s.app.Get("/ws/terminal/:projectId", websocket.New(s.handleTerminalWebSocket))

	if s.embeddedFS != nil {
		s.setupStaticSPA()
	}
}

func (s *Server) setupStaticSPA() {
	fileServer := http.FS(s.embeddedFS)

	s.app.Use("/", filesystem.New(filesystem.Config{
		Root:         fileServer,
		Index:        "index.html",
		NotFoundFile: "index.html",
		Browse:       false,
	}))

	s.app.Use(func(c *fiber.Ctx) error {
		path := c.Path()
		if strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/ws") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "endpoint not found",
			})
		}

		file, err := s.embeddedFS.Open("index.html")
		if err != nil {
			return c.Status(fiber.StatusOK).SendString("sPanel Backend Running (Frontend build not yet embedded)")
		}
		defer file.Close()

		c.Set("Content-Type", "text/html; charset=utf-8")
		return filesystem.SendFile(c, http.FS(s.embeddedFS), "index.html")
	})
}

func (s *Server) Start(port string) error {
	addr := fmt.Sprintf(":%s", port)
	log.Printf("[PANEL] Server listening on http://0.0.0.0:%s", port)
	return s.app.Listen(addr)
}

func (s *Server) App() *fiber.App {
	return s.app
}
