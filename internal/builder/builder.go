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

	var combinedWriter io.Writer = opts.LogWriter
	if combinedWriter == nil {
		combinedWriter = os.Stdout
	}

	header := fmt.Sprintf("=== [sPanel Ephemeral Builder] ===\nDeployment: %s\nProject: %s\nTarget Image: %s\nStarted: %s\n\n",
		opts.DeploymentID, opts.ProjectName, opts.ImageTag, startTime.Format(time.RFC3339))
	_, _ = combinedWriter.Write([]byte(header))

	absSourceDir, _ := filepath.Abs(opts.SourceDir)
	dockerfilePath := filepath.Join(opts.SourceDir, "Dockerfile")
	var cmd *exec.Cmd

	relDockerfilePath := "Dockerfile"

	if _, err := os.Stat(dockerfilePath); os.IsNotExist(err) {
		// Use Nixpacks Ephemeral Container to generate Dockerfile without docker.sock
		_, _ = combinedWriter.Write([]byte("⚡ No Dockerfile detected. Generating build plan with Nixpacks...\n"))
		
		// Ensure spanel-nixpacks-builder image exists
		checkImg := exec.CommandContext(ctx, "docker", "image", "inspect", "spanel-nixpacks-builder")
		if err := checkImg.Run(); err != nil {
			_, _ = combinedWriter.Write([]byte("📦 Initializing sPanel Builder Engine (First time only, may take a minute)...\n"))
			builderDockerfile := `FROM ubuntu:22.04
RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN curl -sSL https://nixpacks.com/install.sh | bash
ENTRYPOINT ["nixpacks"]`
			tmpFile, _ := os.CreateTemp("", "Dockerfile.builder")
			tmpFile.Write([]byte(builderDockerfile))
			tmpFile.Close()
			defer os.Remove(tmpFile.Name())

			buildBuilderCmd := exec.CommandContext(ctx, "docker", "build", "-t", "spanel-nixpacks-builder", "-f", tmpFile.Name(), filepath.Dir(tmpFile.Name()))
			buildBuilderCmd.Stdout = combinedWriter
			buildBuilderCmd.Stderr = combinedWriter
			if err := buildBuilderCmd.Run(); err != nil {
				return nil, fmt.Errorf("failed to build nixpacks builder: %w", err)
			}
		}

		genArgs := []string{
			"run", "--rm",
			"-v", fmt.Sprintf("%s:/app", absSourceDir),
			"spanel-nixpacks-builder",
			"build", "/app", "--out", "/app/.nixpacks",
		}
		for k, v := range opts.EnvVars {
			genArgs = append(genArgs, "--env", fmt.Sprintf("%s=%s", k, v))
		}
		genCmd := exec.CommandContext(ctx, "docker", genArgs...)
		genOut, err := genCmd.CombinedOutput()
		_, _ = combinedWriter.Write(genOut)
		if err != nil {
			return &BuildResult{
				Success:    false,
				Duration:   time.Since(startTime),
				LogPath:    logFilePath,
				ErrorTrace: fmt.Sprintf("Nixpacks generation failed: %v\nOutput: %s", err, string(genOut)),
			}, err
		}
		relDockerfilePath = filepath.Join(".nixpacks", "Dockerfile")
	}

	// Use optimized Dockerfile build with live streaming
	_, _ = combinedWriter.Write([]byte("📦 Running native Docker build...\n"))
	buildArgs := []string{"build", "-t", opts.ImageTag, "-f", relDockerfilePath}
	for k, v := range opts.EnvVars {
		buildArgs = append(buildArgs, "--build-arg", fmt.Sprintf("%s=%s", k, v))
	}
	buildArgs = append(buildArgs, ".")
	cmd = exec.CommandContext(ctx, "docker", buildArgs...)
	cmd.Dir = opts.SourceDir

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
