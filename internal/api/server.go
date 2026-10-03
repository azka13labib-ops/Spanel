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

	"spanel/internal/config"
	"spanel/internal/queue"
)

type Server struct {
	app        *fiber.App
	db         *gorm.DB
	queue      *queue.Queue
	cfg        *config.Config
	embeddedFS fs.FS
}

func NewServer(database *gorm.DB, q *queue.Queue, cfg *config.Config, embeddedFS fs.FS) *Server {
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
	}

	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	// API Group
	apiGroup := s.app.Group("/api")

	// System Health & Info
	apiGroup.Get("/health", s.handleHealth)
	apiGroup.Get("/system/metrics", s.handleSystemMetrics)

	// Projects
	apiGroup.Get("/projects", s.handleListProjects)
	apiGroup.Post("/projects", s.handleCreateProject)
	apiGroup.Get("/projects/:id", s.handleGetProject)
	apiGroup.Post("/projects/:id/deploy", s.handleTriggerDeploy)
	apiGroup.Post("/projects/:id/rollback", s.handleTriggerRollback)
	apiGroup.Post("/projects/:id/attach-db", s.handleAttachDatabase)

	// Deployments
	apiGroup.Get("/deployments/:id", s.handleGetDeployment)

	// Marketplace
	apiGroup.Get("/marketplace", s.handleListMarketplace)
	apiGroup.Post("/marketplace/install", s.handleInstallMarketplaceService)

	// AI Remediation
	apiGroup.Get("/remediations/:id", s.handleGetRemediation)
	apiGroup.Post("/remediations/:id/apply", s.handleApplyRemediation)

	// GitHub Integration
	apiGroup.Get("/github/status", s.handleGitHubStatus)
	apiGroup.Post("/github/connect", s.handleGitHubConnect)
	apiGroup.Post("/github/disconnect", s.handleGitHubDisconnect)
	apiGroup.Get("/github/repos", s.handleGitHubListRepos)
	apiGroup.Get("/github/repos/:owner/:repo/branches", s.handleGitHubListBranches)

	// WebSockets (Log Streaming & Web Terminal)
	s.app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	s.app.Get("/ws/logs/:deploymentId", websocket.New(s.handleLogStreamWebSocket))
	s.app.Get("/ws/terminal/:containerId", websocket.New(s.handleTerminalWebSocket))

	// Serve Embedded Next.js SPA
	if s.embeddedFS != nil {
		s.setupStaticSPA()
	}
}

func (s *Server) setupStaticSPA() {
	// Use Go http.FS wrapper on embeddedFS
	fileServer := http.FS(s.embeddedFS)

	s.app.Use("/", filesystem.New(filesystem.Config{
		Root:         fileServer,
		Index:        "index.html",
		NotFoundFile: "index.html", // SPA fallback for client-side routing
		Browse:       false,
	}))

	// Fallback route for HTML5 History API (Next.js App router)
	s.app.Use(func(c *fiber.Ctx) error {
		// If path starts with /api or /ws, return 404 JSON
		path := c.Path()
		if strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/ws") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "endpoint not found",
			})
		}

		// Otherwise serve root index.html from embedded FS
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
