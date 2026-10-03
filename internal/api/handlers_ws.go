package api

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	websocket "github.com/gofiber/websocket/v2"
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
	containerID := c.Params("containerId")
	defer c.Close()

	_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Connecting to container %s terminal...\r\n", containerID)))

	cmd := exec.Command("docker", "exec", "-it", containerID, "/bin/sh")
	stdin, _ := cmd.StdinPipe()
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Failed to exec terminal: %v\r\n", err)))
		return
	}

	// Output reader to WS
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				_ = c.WriteMessage(websocket.BinaryMessage, buf[:n])
			}
			if err != nil {
				break
			}
		}
	}()

	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stderr.Read(buf)
			if n > 0 {
				_ = c.WriteMessage(websocket.BinaryMessage, buf[:n])
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
			break
		}
		_, _ = stdin.Write(msg)
	}

	_ = cmd.Process.Kill()
}
