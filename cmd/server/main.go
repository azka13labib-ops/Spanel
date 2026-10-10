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

	cfg := config.Load()
	log.Printf("[CONFIG] Data Dir: %s, Port: %s", cfg.DataDir, cfg.Port)

	database, err := db.Init(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("[FATAL] Failed to initialize SQLite database: %v", err)
	}

	q := queue.NewQueue(database)
	aiAgent := ai.NewAIAgent()
	deploySvc := service.NewDeployService(database, aiAgent, cfg)

	q.RegisterHandler("deploy", deploySvc.HandleDeploy)
	q.RegisterHandler("rollback", deploySvc.HandleRollback)

	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()
	q.Start(workerCtx)

	cleaner := janitor.NewJanitor(q)
	cleaner.Start()
	defer cleaner.Stop()

	embeddedWebFS := spanel.GetWebFS()
	srv := api.NewServer(database, q, cfg, embeddedWebFS, aiAgent)

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

	if err := srv.Start(cfg.Port); err != nil {
		log.Fatalf("[FATAL] Server terminated: %v", err)
	}
}
