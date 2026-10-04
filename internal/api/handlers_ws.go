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

	// Tail the file
	file, err := os.Open(logFilePath)
	if err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Log file not found: %s. Waiting for build to start...\n", deploymentID)))
	}

	var reader *bufio.Reader
	if file != nil {
		defer file.Close()
		reader = bufio.NewReader(file)
	}

	for {
		if reader != nil {
			line, err := reader.ReadString('\n')
			if err == nil {
				if err := c.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
					break
				}
				continue
			}
			if err == io.EOF {
				time.Sleep(500 * time.Millisecond)
				continue
			}
		} else {
			// Retry open
			if f, err := os.Open(logFilePath); err == nil {
				file = f
				defer file.Close()
				reader = bufio.NewReader(file)
				continue
			}
			time.Sleep(1 * time.Second)
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

	containerID := "spanel-" + project.ID

	_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Connecting to project %s terminal...\r\n", project.Name)))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", "exec", "-it", containerID, "/bin/sh")
	stdin, _ := cmd.StdinPipe()
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Failed to exec terminal: %v\r\n", err)))
		return
	}

	// Output reader to WS
	go func() {
		defer cancel()
		buf := make([]byte, 1024)
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				if err := c.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
					break
				}
			}
			if err != nil {
				break
			}
		}
	}()

	go func() {
		defer cancel()
		buf := make([]byte, 1024)
		for {
			n, err := stderr.Read(buf)
			if n > 0 {
				if err := c.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
					break
				}
			}
			if err != nil {
				break
			}
		}
	}()

	// WS input to stdin
	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			cancel()
			break
		}
		_, _ = stdin.Write(msg)
	}

	go func() {
		_ = cmd.Wait()
	}()
}
