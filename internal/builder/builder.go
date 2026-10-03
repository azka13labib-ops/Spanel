package builder

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type BuildOptions struct {
	DeploymentID string
	ProjectID    string
	ProjectName  string
	SourceDir    string
	ImageTag     string
	EnvVars      map[string]string
	LogWriter    io.Writer
}

type BuildResult struct {
	ImageTag   string
	Success    bool
	Duration   time.Duration
	LogPath    string
	ErrorTrace string
}

// BuildWithNixpacksEphemeral runs Nixpacks inside an ephemeral docker container
// This isolates untrusted user repos from the host OS!
func BuildWithNixpacksEphemeral(ctx context.Context, opts *BuildOptions) (*BuildResult, error) {
	startTime := time.Now()
	log.Printf("[BUILDER] Starting ephemeral build for project %s (deployment: %s)", opts.ProjectName, opts.DeploymentID)

	// Ensure log file destination exists
	logsDir := filepath.Join(".", "data", "logs")
	_ = os.MkdirAll(logsDir, 0755)
	logFilePath := filepath.Join(logsDir, fmt.Sprintf("%s.log", opts.DeploymentID))

	fileLog, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file: %w", err)
	}
	defer fileLog.Close()

	// MultiWriter to write to file and optional real-time stream (e.g., WebSocket)
	var combinedWriter io.Writer = fileLog
	if opts.LogWriter != nil {
		combinedWriter = io.MultiWriter(fileLog, opts.LogWriter)
	}

	header := fmt.Sprintf("=== [sPanel Ephemeral Builder] ===\nDeployment: %s\nProject: %s\nTarget Image: %s\nStarted: %s\n\n",
		opts.DeploymentID, opts.ProjectName, opts.ImageTag, startTime.Format(time.RFC3339))
	_, _ = combinedWriter.Write([]byte(header))

	absSourceDir, _ := filepath.Abs(opts.SourceDir)
	dockerfilePath := filepath.Join(opts.SourceDir, "Dockerfile")
	var cmd *exec.Cmd

	if _, err := os.Stat(dockerfilePath); err == nil {
		// Use optimized Dockerfile build with live streaming
		_, _ = combinedWriter.Write([]byte("📦 Detected Dockerfile! Running optimized native Docker build...\n"))
		buildArgs := []string{"build", "-t", opts.ImageTag}
		for k, v := range opts.EnvVars {
			buildArgs = append(buildArgs, "--build-arg", fmt.Sprintf("%s=%s", k, v))
		}
		buildArgs = append(buildArgs, ".")
		cmd = exec.CommandContext(ctx, "docker", buildArgs...)
		cmd.Dir = opts.SourceDir
	} else {
		// Use Nixpacks Ephemeral Container
		_, _ = combinedWriter.Write([]byte("⚡ No Dockerfile detected. Using Ephemeral Nixpacks Container...\n"))
		args := []string{
			"run", "--rm",
			"-v", fmt.Sprintf("%s:/app:ro", absSourceDir),
			"-v", "/var/run/docker.sock:/var/run/docker.sock",
			"ghcr.io/railwayapp/nixpacks:latest",
			"build", "/app",
			"--name", opts.ImageTag,
		}
		for k, v := range opts.EnvVars {
			args = append(args, "--env", fmt.Sprintf("%s=%s", k, v))
		}
		cmd = exec.CommandContext(ctx, "docker", args...)
	}

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdout pipe: %w", err)
	}
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		errMsg := fmt.Sprintf("Failed to launch builder container: %v\n", err)
		_, _ = combinedWriter.Write([]byte(errMsg))
		return &BuildResult{
			Success:    false,
			Duration:   time.Since(startTime),
			LogPath:    logFilePath,
			ErrorTrace: errMsg,
		}, err
	}

	// Stream logs in goroutines
	var errorLines []string
	go streamOutput(stdoutPipe, combinedWriter, nil)
	streamOutput(stderrPipe, combinedWriter, &errorLines)

	err = cmd.Wait()
	duration := time.Since(startTime)

	if err != nil {
		failMsg := fmt.Sprintf("\n❌ Build failed after %v: %v\n", duration, err)
		_, _ = combinedWriter.Write([]byte(failMsg))
		return &BuildResult{
			Success:    false,
			Duration:   duration,
			LogPath:    logFilePath,
			ErrorTrace: strings.Join(errorLines, "\n"),
		}, fmt.Errorf("build failed: %w", err)
	}

	successMsg := fmt.Sprintf("\n✅ Build succeeded in %v! Image: %s\n", duration, opts.ImageTag)
	_, _ = combinedWriter.Write([]byte(successMsg))

	return &BuildResult{
		ImageTag: opts.ImageTag,
		Success:  true,
		Duration: duration,
		LogPath:  logFilePath,
	}, nil
}

func streamOutput(r io.Reader, w io.Writer, errorCollector *[]string) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := scanner.Text()
		_, _ = fmt.Fprintln(w, line)

		if errorCollector != nil {
			*errorCollector = append(*errorCollector, line)
			// Keep max last 200 error lines
			if len(*errorCollector) > 200 {
				*errorCollector = (*errorCollector)[1:]
			}
		}
	}
	if err := scanner.Err(); err != nil && err != io.EOF {
		log.Printf("[BUILDER STREAM] scanner error: %v", err)
	}
}
