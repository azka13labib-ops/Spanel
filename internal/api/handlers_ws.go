package api

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"time"

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

	var project db.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte("Project not found\r\n"))
		return
	}

	containerID := "spanel-app-" + project.Name

	_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Connecting to project %s terminal...\r\n", project.Name)))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", "exec", "-i", containerID, "/bin/sh")
	stdin, _ := cmd.StdinPipe()
	pr, pw := io.Pipe()
	cmd.Stdout = pw
	cmd.Stderr = pw

	if err := cmd.Start(); err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Failed to exec terminal: %v\r\n", err)))
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
			if _, err := stdin.Write(msg); err != nil {
				return
			}
		}
	}()

	<-done
	cancel()
	_ = cmd.Wait()
}
