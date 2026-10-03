package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"spanel"
	"spanel/internal/ai"
	"spanel/internal/api"
	"spanel/internal/config"
	"spanel/internal/db"
	"spanel/internal/janitor"
	"spanel/internal/queue"
	"spanel/internal/service"
)

func main() {
	log.Println("==================================================")
	log.Println("🚀 sPanel — Zero-Config AI-Powered Self-Hosted PaaS")
	log.Println("==================================================")

	// 1. Load Configuration
	cfg := config.Load()
	log.Printf("[CONFIG] Data Dir: %s, Port: %s", cfg.DataDir, cfg.Port)

	// 2. Initialize SQLite in WAL mode
	database, err := db.Init(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("[FATAL] Failed to initialize SQLite database: %v", err)
	}

	// 3. Initialize Queue & Worker Services
	q := queue.NewQueue(database)
	aiAgent := ai.NewAIAgent()
	deploySvc := service.NewDeployService(database, aiAgent, cfg)

	// Register Queue Handlers
	q.RegisterHandler("deploy", deploySvc.HandleDeploy)

	// Start Queue Worker
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()
	q.Start(workerCtx)

	// 4. Initialize Janitor (3 AM auto-prune cron)
	cleaner := janitor.NewJanitor(q)
	cleaner.Start()
	defer cleaner.Stop()

	// 5. Initialize Web Server with Embedded Next.js SPA
	embeddedWebFS := spanel.GetWebFS()
	srv := api.NewServer(database, q, cfg, embeddedWebFS)

	// 6. Graceful Shutdown Handling
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigCh
		log.Println("[PANEL] Gracefully shutting down...")
		workerCancel()
		q.Stop()
		_ = srv.App().Shutdown()
		os.Exit(0)
	}()

	// 7. Start HTTP Server
	if err := srv.Start(cfg.Port); err != nil {
		log.Fatalf("[FATAL] Server terminated: %v", err)
	}
}
