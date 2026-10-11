package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"golang.org/x/term"

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

	if len(os.Args) >= 2 && (os.Args[1] == "reset-password" || os.Args[1] == "--reset-password") {
		if len(os.Args) > 2 {
			log.Fatalf("[FATAL] For security, do not pass passwords as command-line arguments (they appear in process lists and shell history). Run without arguments for hidden prompt, or pipe via stdin: echo 'pass' | spanel reset-password")
		}

		var newPass string
		if term.IsTerminal(int(os.Stdin.Fd())) {
			fmt.Print("Enter new administrator password (min 8 chars): ")
			bytePass, err := term.ReadPassword(int(os.Stdin.Fd()))
			fmt.Println()
			if err != nil {
				log.Fatalf("[FATAL] Failed to read password from terminal: %v", err)
			}
			fmt.Print("Confirm new administrator password: ")
			byteConfirm, err := term.ReadPassword(int(os.Stdin.Fd()))
			fmt.Println()
			if err != nil {
				log.Fatalf("[FATAL] Failed to read confirmation from terminal: %v", err)
			}
			if string(bytePass) != string(byteConfirm) {
				log.Fatalf("[FATAL] Passwords do not match")
			}
			newPass = string(bytePass)
		} else {
			// Read from stdin (piped for scripted deployments: echo "pass" | spanel reset-password)
			reader := bufio.NewReader(os.Stdin)
			line, err := reader.ReadString('\n')
			if err != nil && len(line) == 0 {
				log.Fatalf("[FATAL] Failed to read password from stdin: %v", err)
			}
			newPass = strings.TrimRight(line, "\r\n")
		}

		if len(newPass) < 8 {
			log.Fatalf("[FATAL] Password must be at least 8 characters")
		}

		if err := api.ResetAdminPassword(cfg.DataDir, database, newPass); err != nil {
			log.Fatalf("[FATAL] Credential rotation failed: %v", err)
		}
		log.Println("[SECURITY] Administrator password reset successfully. All active sessions have been revoked.")
		return
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
