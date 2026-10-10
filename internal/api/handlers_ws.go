package api

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/creack/pty"
	websocket "github.com/gofiber/websocket/v2"
	"spanel/internal/db"
)

// handleLogStreamWebSocket streams deployment build/run logs via WebSocket
func (s *Server) handleLogStreamWebSocket(c *websocket.Conn) {
	deploymentID := c.Params("deploymentId")
	defer c.Close()

	logFilePath := filepath.Join(".", "data", "logs", fmt.Sprintf("%s.log", deploymentID))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { // detect client close
		defer cancel()
		for { 
			if _, _, err := c.ReadMessage(); err != nil { 
				return 
			} 
		}
	}()

	var file *os.File
	for {
		if f, err := os.Open(logFilePath); err == nil {
			file = f
			break
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(1 * time.Second):
		}
	}
	defer file.Close()
	
	reader := bufio.NewReader(file)
	ping := time.NewTicker(20 * time.Second)
	defer ping.Stop()

	for {
		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			if c.WriteMessage(websocket.TextMessage, []byte(line)) != nil {
				return
			}
		}
		if err == io.EOF {
			select {
			case <-ctx.Done():
				return
			case <-ping.C:
				if c.WriteMessage(websocket.PingMessage, nil) != nil {
					return
				}
			case <-time.After(500 * time.Millisecond):
			}

			// check if deployment terminal to stop tailing
			var d db.Deployment
			if s.db.Select("status").First(&d, "id = ?", deploymentID).Error == nil {
				if d.Status == "healthy" || d.Status == "failed" {
					return
				}
			}
		} else if err != nil {
			return
		}
	}
}

// handleRuntimeLogStreamWebSocket streams docker logs of the running container
func (s *Server) handleRuntimeLogStreamWebSocket(c *websocket.Conn) {
	projectID := c.Params("projectId")
	defer c.Close()

	var project db.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte("Project not found\r\n"))
		return
	}

	containerID := "spanel-app-" + project.Name
	_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Attaching to %s logs...\r\n", containerID)))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() { // detect client close
		defer cancel()
		for { 
			if _, _, err := c.ReadMessage(); err != nil { 
				return 
			} 
		}
	}()

	cmd := exec.CommandContext(ctx, "docker", "logs", "-f", "--tail", "100", containerID)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return
	}
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte("Failed to attach to logs.\r\n"))
		return
	}

	reader := bufio.NewReader(stdout)
	ping := time.NewTicker(20 * time.Second)
	defer ping.Stop()

	go func() {
		<-ctx.Done()
		cmd.Process.Kill()
	}()

	for {
		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			if c.WriteMessage(websocket.TextMessage, []byte(line)) != nil {
				return
			}
		}
		if err != nil {
			if err == io.EOF {
				_ = c.WriteMessage(websocket.TextMessage, []byte("\r\n[Stream ended]\r\n"))
			}
			return
		}

		select {
		case <-ping.C:
			if c.WriteMessage(websocket.PingMessage, nil) != nil {
				return
			}
		default:
		}
	}
}

// handleTerminalWebSocket opens an interactive sh session inside a Docker container
func (s *Server) handleTerminalWebSocket(c *websocket.Conn) {
	projectID := c.Params("projectId")
	defer c.Close()

	cleanID := strings.TrimPrefix(projectID, "spanel-app-")
	var project db.Project
	if err := s.db.First(&project, "id = ? OR name = ?", cleanID, cleanID).Error; err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[ERROR]\x1b[0m Application or Container '%s' not found.\r\n", projectID)))
		return
	}

	containerID := "spanel-app-" + project.Name

	// Validate container is actively running
	inspectCmd := exec.Command("docker", "inspect", "--format", "{{.State.Running}}", containerID)
	out, err := inspectCmd.Output()
	if err != nil || strings.TrimSpace(string(out)) != "true" {
		_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[33m[NOTICE]\x1b[0m Container '%s' is stopped. Start the application to access the console.\r\n", containerID)))
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Try allocating real UNIX pseudo-terminal (PTY)
	cmd := exec.CommandContext(ctx, "docker", "exec", "-it", "-e", "TERM=xterm-256color", containerID, "sh", "-c", "if [ -x /bin/bash ]; then exec /bin/bash; elif [ -x /bin/sh ]; then exec /bin/sh; else exec sh; fi")

	ptmx, ptyErr := pty.Start(cmd)
	if ptyErr == nil {
		defer func() {
			_ = ptmx.Close()
			if cmd.Process != nil {
				_ = cmd.Process.Kill()
			}
		}()

		// Default initial size
		_ = pty.Setsize(ptmx, &pty.Winsize{Rows: 24, Cols: 80})

		done := make(chan struct{})

		// PTY Output -> WebSocket
		go func() {
			defer close(done)
			buf := make([]byte, 4096)
			for {
				n, err := ptmx.Read(buf)
				if n > 0 {
					if c.WriteMessage(websocket.BinaryMessage, buf[:n]) != nil {
						return
					}
				}
				if err != nil {
					return
				}
			}
		}()

		// WebSocket Input -> PTY
		go func() {
			defer cancel()
			for {
				_, msg, err := c.ReadMessage()
				if err != nil {
					return
				}

				// Check for resize JSON payload: {"type":"resize","cols":120,"rows":30}
				if len(msg) > 10 && msg[0] == '{' {
					var resizeMsg struct {
						Type string `json:"type"`
						Cols uint16 `json:"cols"`
						Rows uint16 `json:"rows"`
					}
					if json.Unmarshal(msg, &resizeMsg) == nil && resizeMsg.Type == "resize" {
						if resizeMsg.Cols > 0 && resizeMsg.Rows > 0 {
							_ = pty.Setsize(ptmx, &pty.Winsize{Rows: resizeMsg.Rows, Cols: resizeMsg.Cols})
							continue
						}
					}
				}

				if _, err := ptmx.Write(msg); err != nil {
					return
				}
			}
		}()

		<-done
		_ = cmd.Wait()
		return
	}

	// Fallback to pipe-based execution (Windows dev environment)
	cmdFallback := exec.CommandContext(ctx, "docker", "exec", "-i", "-e", "TERM=xterm-256color", containerID, "/bin/sh")
	stdin, err := cmdFallback.StdinPipe()
	if err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[ERROR]\x1b[0m Failed to setup stdin: %v\r\n", err)))
		return
	}
	pr, pw := io.Pipe()
	cmdFallback.Stdout = pw
	cmdFallback.Stderr = pw

	if err := cmdFallback.Start(); err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[ERROR]\x1b[0m Failed to exec container process: %v\r\n", err)))
		return
	}

	done := make(chan struct{})

	// Output reader to WS
	go func() {
		defer close(done)
		buf := make([]byte, 4096)
		for {
			n, err := pr.Read(buf)
			if n > 0 && c.WriteMessage(websocket.BinaryMessage, buf[:n]) != nil {
				return
			}
			if err != nil {
				return
			}
		}
	}()

	// WS input to stdin
	go func() {
		defer cancel()
		for {
			_, msg, err := c.ReadMessage()
			if err != nil {
				return
			}
			if len(msg) > 10 && msg[0] == '{' {
				// Ignore resize in non-PTY fallback
				continue
			}
			if _, err := stdin.Write(msg); err != nil {
				return
			}
		}
	}()

	<-done
	cancel()
	_ = cmdFallback.Wait()
}

