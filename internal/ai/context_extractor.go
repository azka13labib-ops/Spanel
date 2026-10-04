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
var tokenRegex = regexp.MustCompile(`(ghp_[a-zA-Z0-9]{36}|sk-[a-zA-Z0-9]{48}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})`)

func SanitizeEnvVars(envs map[string]string) map[string]string {
	sanitized := make(map[string]string)
	for k, v := range envs {
		if sensitiveKeyRegex.MatchString(k) {
			sanitized[k] = "[REDACTED_SECRET]"
		} else {
			sanitized[k] = tokenRegex.ReplaceAllString(v, "[REDACTED_TOKEN]")
		}
	}
	return sanitized
}

func sanitizeText(text string, knownSecrets []string) string {
	text = tokenRegex.ReplaceAllString(text, "[REDACTED_TOKEN]")
	for _, s := range knownSecrets {
		if s != "" && len(s) > 4 {
			text = strings.ReplaceAll(text, s, "[REDACTED_SECRET]")
		}
	}
	return text
}

func ExtractLogContext(logFilePath string, knownSecrets []string) (*ExtractedContext, error) {
	file, err := os.Open(logFilePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var allLines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		allLines = append(allLines, sanitizeText(scanner.Text(), knownSecrets))
	}
	if err := scanner.Err(); err != nil {
		return nil, err
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

	var errorSig strings.Builder
	for _, line := range tail {
		lower := strings.ToLower(line)
		if strings.Contains(lower, "error:") ||
			strings.Contains(lower, "failed") ||
			strings.Contains(lower, "panic:") ||
			strings.Contains(lower, "exception") ||
			strings.Contains(lower, "oomkilled") {
			errorSig.WriteString(line)
			errorSig.WriteString("\n")
		}
	}

	return &ExtractedContext{
		HeaderLines:    header,
		TailLines:      tail,
		ErrorSignature: strings.TrimSpace(errorSig.String()),
	}, nil
}
