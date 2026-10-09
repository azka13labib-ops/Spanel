package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

var ErrLoopBreakerTriggered = errors.New("remediation retry limit reached (max 3 retries); flagged as failed_needs_human")

type RemediationPlan struct {
	ErrorCategory string                 `json:"error_category"` 
	Analysis      string                 `json:"analysis"`
	ConfigChanges map[string]interface{} `json:"config_changes,omitempty"`
	SuggestedCode string                 `json:"suggested_code,omitempty"`
}

type AIAgent struct {
	httpClient *http.Client
}

func NewAIAgent() *AIAgent {
	return &AIAgent{
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

func (a *AIAgent) DiagnoseAndRemediate(
	ctx context.Context,
	provider string,
	apiKey string,
	retryCount int,
	logCtx *ExtractedContext,
) (*RemediationPlan, error) {
	if retryCount >= 3 {
		return nil, ErrLoopBreakerTriggered
	}

	prompt := fmt.Sprintf(`You are an expert Autonomous DevOps AI Agent inside sPanel (a self-hosted PaaS).
A deployment has failed. Analyze the extracted logs and sanitized environment to diagnose the root cause and provide a remediation plan.

--- BUILD LOG HEADER (First 50 lines) ---
%s

--- BUILD LOG TAIL & STDERR (Last 150 lines) ---
%s

--- ERROR SIGNATURE ---
%s

Respond STRICTLY with a valid JSON object matching this schema:
{
  "error_category": "config_issue" | "code_issue" | "oom_killed" | "port_mismatch",
  "analysis": "Clear explanation in Indonesian of what failed and why",
  "config_changes": {
    "recommended_target_port": 3000,
    "recommended_memory_mb": 512,
    "missing_env_keys": ["KEY_NAME"]
  },
  "suggested_code": "Optional suggested code diff or package fix"
}`,
		stringsJoin(logCtx.HeaderLines),
		stringsJoin(logCtx.TailLines),
		logCtx.ErrorSignature,
	)

	switch provider {
	case "gemini":
		return a.callGemini(ctx, apiKey, prompt)
	case "openai":
		return a.callOpenAI(ctx, apiKey, prompt)
	default:
		return a.callGemini(ctx, apiKey, prompt)
	}
}

func stringsJoin(lines []string) string {
	res := ""
	for _, l := range lines {
		res += l + "\n"
	}
	return res
}

func (a *AIAgent) callGemini(ctx context.Context, apiKey string, prompt string) (*RemediationPlan, error) {
	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"response_mime_type": "application/json",
		},
	}

	bodyBytes, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", apiKey)

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gemini api request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gemini api error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(respBody, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse gemini response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, errors.New("empty response from gemini")
	}

	rawJSON := geminiResp.Candidates[0].Content.Parts[0].Text
	var plan RemediationPlan
	if err := json.Unmarshal([]byte(rawJSON), &plan); err != nil {
		return &RemediationPlan{
			ErrorCategory: "unknown",
			Analysis:      rawJSON,
		}, nil
	}

	return &plan, nil
}

func (a *AIAgent) callOpenAI(ctx context.Context, apiKey string, prompt string) (*RemediationPlan, error) {
	url := "https://api.openai.com/v1/chat/completions"

	payload := map[string]interface{}{
		"model": "gpt-4o-mini",
		"messages": []map[string]string{
			{"role": "system", "content": "You are sPanel AI DevOps Agent. Respond only in JSON."},
			{"role": "user", "content": prompt},
		},
		"response_format": map[string]string{"type": "json_object"},
	}

	bodyBytes, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("openai api request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openai api error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var oaiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(respBody, &oaiResp); err != nil {
		return nil, fmt.Errorf("failed to parse openai response: %w", err)
	}

	if len(oaiResp.Choices) == 0 {
		return nil, errors.New("empty response from openai")
	}

	var plan RemediationPlan
	if err := json.Unmarshal([]byte(oaiResp.Choices[0].Message.Content), &plan); err != nil {
		return &RemediationPlan{
			ErrorCategory: "unknown",
			Analysis:      oaiResp.Choices[0].Message.Content,
		}, nil
	}

	return &plan, nil
}

// TestConnection validates the API key against the chosen AI provider
func (a *AIAgent) TestConnection(ctx context.Context, provider string, apiKey string) (string, error) {
	if apiKey == "" {
		return "", errors.New("API key tidak boleh kosong")
	}

	switch provider {
	case "gemini":
		url := "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return "", err
		}
		resp, err := a.httpClient.Do(req)
		if err != nil {
			return "", fmt.Errorf("gagal terhubung ke Google Gemini: %w", err)
		}
		defer resp.Body.Close()
		bodyBytes, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != http.StatusOK {
			var errResp struct {
				Error struct {
					Message string `json:"message"`
					Status  string `json:"status"`
				} `json:"error"`
			}
			if err := json.Unmarshal(bodyBytes, &errResp); err == nil && errResp.Error.Message != "" {
				return "", fmt.Errorf("Gemini error (%d): %s", resp.StatusCode, errResp.Error.Message)
			}
			return "", fmt.Errorf("Gemini API error (status %d): %s", resp.StatusCode, string(bodyBytes))
		}
		return "Koneksi Google Gemini API berhasil diverifikasi!", nil

	case "openai":
		url := "https://api.openai.com/v1/models"
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return "", err
		}
		req.Header.Set("Authorization", "Bearer "+apiKey)
		resp, err := a.httpClient.Do(req)
		if err != nil {
			return "", fmt.Errorf("gagal terhubung ke OpenAI: %w", err)
		}
		defer resp.Body.Close()
		bodyBytes, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != http.StatusOK {
			var errResp struct {
				Error struct {
					Message string `json:"message"`
					Type    string `json:"type"`
				} `json:"error"`
			}
			if err := json.Unmarshal(bodyBytes, &errResp); err == nil && errResp.Error.Message != "" {
				return "", fmt.Errorf("OpenAI error (%d): %s", resp.StatusCode, errResp.Error.Message)
			}
			return "", fmt.Errorf("OpenAI API error (status %d): %s", resp.StatusCode, string(bodyBytes))
		}
		return "Koneksi OpenAI API berhasil diverifikasi!", nil

	default:
		return "", fmt.Errorf("provider AI '%s' tidak didukung (pilih 'gemini' atau 'openai')", provider)
	}
}

