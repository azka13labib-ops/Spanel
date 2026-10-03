package ai

import (
	"bufio"
	"os"
	"regexp"
	"strings"
)

type ExtractedContext struct {
	HeaderLines    []string
	TailLines      []string
	Manifest       string
	SanitizedEnvs  map[string]string
	ErrorSignature string
}

var sensitiveKeyRegex = regexp.MustCompile(`(?i)(key|secret|password|token|auth|credential|jwt|cert)`)

// SanitizeEnvVars hides sensitive values while preserving variable keys
func SanitizeEnvVars(envs map[string]string) map[string]string {
	sanitized := make(map[string]string)
	for k, v := range envs {
		if sensitiveKeyRegex.MatchString(k) {
			sanitized[k] = "[REDACTED_SECRET]"
		} else {
			sanitized[k] = v
		}
	}
	return sanitized
}

// ExtractLogContext extracts 50 first lines + 150 last lines from a build log file
func ExtractLogContext(logFilePath string) (*ExtractedContext, error) {
	file, err := os.Open(logFilePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var allLines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		allLines = append(allLines, scanner.Text())
	}

	total := len(allLines)
	var header []string
	var tail []string

	if total <= 200 {
		header = allLines
	} else {
		header = allLines[:50]
		tail = allLines[total-150:]
	}

	// Identify potential error signatures
	var errorSig strings.Builder
	for _, line := range tail {
		lower := strings.ToLower(line)
		if strings.Contains(lower, "error:") ||
			strings.Contains(lower, "failed") ||
			strings.Contains(lower, "panic:") ||
			strings.Contains(lower, "exception") ||
			strings.Contains(lower, "oomkilled") {
			errorSig.WriteString(line + "\n")
		}
	}

	return &ExtractedContext{
		HeaderLines:    header,
		TailLines:      tail,
		ErrorSignature: strings.TrimSpace(errorSig.String()),
	}, nil
}
