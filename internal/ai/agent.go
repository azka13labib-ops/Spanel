package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
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

// AnswerDocsQuestion uses configured AI providers to answer documentation and troubleshooting questions.
func (a *AIAgent) AnswerDocsQuestion(ctx context.Context, provider, apiKey, question string) (string, error) {
	systemPrompt := `You are the sPanel Intelligent Documentation Assistant ("sPanel Docs AI").
sPanel is a Zero-Config AI-Powered Self-Hosted Platform as a Service (PaaS) built with Go Fiber, Next.js, SQLite (WAL mode), Docker, Nixpacks, and Traefik.

Key facts about sPanel:
1. Architecture: Single Linux binary distributing backend REST API, WebSockets, and embedded Next.js static export. Zero Node.js runtime required on host.
2. Deployment: Uses ephemeral Nixpacks builder inside Docker to auto-detect language (Node.js, Next.js, Python, Go, PHP/Laravel, Rust, etc.). Zero-downtime rolling updates with Traefik reverse proxy health checks. Instant rollback supported via stored image hashes.
3. Domains: Free staging magic domain (e.g., <name>.<ip>.sslip.io) and custom domain with automatic Traefik TLS.
4. Databases: 1-click provisioning for PostgreSQL, MySQL, Redis, and SQLite. Automatic internal Docker network linking and auto-injection of complete environment variables (DATABASE_URL, DB_HOST, DB_PASSWORD, REDIS_URL, etc.).
5. Environment Variables:
   - Build-time variables: injected into nixpacks/npm build (critical for Next.js NEXT_PUBLIC_* variables embedded in client bundles).
   - Runtime variables: injected into the running application container.
   - Secret variables: masked in the UI and stored encrypted via AES-256-GCM.
6. Security & Auth: Strictly cookie-only session authentication (spanel_session) with CSRF Origin/Referer verification. Unencrypted access on private/Tailscale networks requires SPANEL_ALLOW_INSECURE_HTTP=true.
7. Admin CLI: Reset admin password via host CLI: echo 'MyNewPassword123' | spanel reset-password.
8. Troubleshooting: Docker stopped containers can be pruned with 'docker container prune -f'. Logs available via 'journalctl -u spanel -f'.

Provide a direct, helpful, and technically accurate answer with Markdown code snippets and clear step-by-step guidance. Use Indonesian if the user asks in Indonesian, or English if asked in English.`

	if apiKey == "" {
		return a.GetLocalDocsAnswer(question), nil
	}

	fullPrompt := fmt.Sprintf("%s\n\nUser Question:\n%s", systemPrompt, question)

	switch provider {
	case "gemini":
		url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
		payload := map[string]interface{}{
			"contents": []map[string]interface{}{
				{
					"parts": []map[string]string{
						{"text": fullPrompt},
					},
				},
			},
		}
		bodyBytes, _ := json.Marshal(payload)
		req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(bodyBytes))
		if err != nil {
			return a.GetLocalDocsAnswer(question), nil
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-goog-api-key", apiKey)

		resp, err := a.httpClient.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			return a.GetLocalDocsAnswer(question), nil
		}
		defer resp.Body.Close()

		var geminiResp struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err == nil && len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
			return geminiResp.Candidates[0].Content.Parts[0].Text, nil
		}

	case "openai":
		url := "https://api.openai.com/v1/chat/completions"
		payload := map[string]interface{}{
			"model": "gpt-4o-mini",
			"messages": []map[string]string{
				{"role": "system", "content": systemPrompt},
				{"role": "user", "content": question},
			},
			"temperature": 0.3,
		}
		bodyBytes, _ := json.Marshal(payload)
		req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(bodyBytes))
		if err != nil {
			return a.GetLocalDocsAnswer(question), nil
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+apiKey)

		resp, err := a.httpClient.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			return a.GetLocalDocsAnswer(question), nil
		}
		defer resp.Body.Close()

		var openaiResp struct {
			Choices []struct {
				Message struct {
					Content string `json:"content"`
				} `json:"message"`
			} `json:"choices"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&openaiResp); err == nil && len(openaiResp.Choices) > 0 {
			return openaiResp.Choices[0].Message.Content, nil
		}
	}

	return a.GetLocalDocsAnswer(question), nil
}

// GetLocalDocsAnswer provides instant, comprehensive knowledge-base responses for common inquiries.
func (a *AIAgent) GetLocalDocsAnswer(question string) string {
	q := strings.ToLower(question)

	if strings.Contains(q, "password") || strings.Contains(q, "lupa") || strings.Contains(q, "reset") {
		return `### 🔑 Cara Reset Password Admin sPanel

Jika Anda lupa password admin sPanel, Anda dapat meresetnya secara instan langsung dari terminal host VPS tanpa downtime:

**1. Menggunakan Stdin Pipe (Direkomendasikan):**
` + "```bash" + `
echo 'PasswordBaruAnda123' | spanel reset-password
` + "```" + `

**2. Menggunakan Prompt Interaktif Tersembunyi:**
` + "```bash" + `
spanel reset-password
# Masukkan password baru saat diminta (karakter disembunyikan demi keamanan)
` + "```" + `

> **Catatan Keamanan:** 
> - Password minimal 8 karakter.
> - Seluruh sesi aktif di database akan otomatis dicabut (*revoked*) demi keamanan.
> - Anda dapat langsung login kembali di browser menggunakan password baru.`
	}

	if strings.Contains(q, "next") || strings.Contains(q, "build-time") || strings.Contains(q, "runtime") || strings.Contains(q, "env") {
		return `### ⚡ Build-Time vs Runtime Environment Variables

Di sPanel, Environment Variables dibagi menjadi 2 scope eksplisit untuk memastikan keamanan dan kompatibilitas framework seperti **Next.js**:

1. **Build-Time Variables ('NEXT_PUBLIC_*', Build Flags):**
   - Di-inject langsung saat proses compile (*Nixpacks builder / npm run build*).
   - Wajib digunakan untuk variabel 'NEXT_PUBLIC_*' pada Next.js karena di-bundle ke dalam file static JS browser.
   - **Penting:** Setiap perubahan pada variabel build-time memerlukan klik **Rebuild** agar nilainya ter-render ke static bundle.

2. **Runtime Variables ('DATABASE_URL', API Secret, dll):**
   - Di-inject ke container saat aplikasi dijalankan (*docker run*).
   - Nilai tidak bocor ke browser pengguna.
   - Cukup klik **Restart Container** untuk menerapkan perubahan.

3. **Secret Masking:**
   - Variabel bertanda *Sensitive / Secret* otomatis disensor dengan tanda bintang di UI dan dienkripsi dengan **AES-256-GCM** di database sPanel.`
	}

	if strings.Contains(q, "database") || strings.Contains(q, "postgres") || strings.Contains(q, "mysql") || strings.Contains(q, "redis") || strings.Contains(q, "attach") {
		return `### 🗄️ Manajemen Database & Auto-Attach sPanel

sPanel mendukung penyediaan database 1-klik dengan integrasi otomatis:

1. **Database yang Didukung:**
   - **PostgreSQL** (Port internal: 5432)
   - **MySQL 8.0** (Port internal: 3306)
   - **Redis 7.2** (Port internal: 6379, in-memory cache)
   - **SQLite** (Embedded)

2. **Fitur Auto-Attach:**
   - Di halaman detail database atau aplikasi, pilih **Attach to Application**.
   - sPanel akan menghubungkan container aplikasi dan database ke dalam Docker Network privat yang sama.
   - Environment variables lengkap otomatis di-inject, seperti:
     - ` + "`DATABASE_URL=postgresql://user:pass@host:5432/dbname`" + `
     - ` + "`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`" + `
     - ` + "`REDIS_URL=redis://:pass@host:6379/0`" + `

3. **Persistent Storage:** Data database disimpan di host volume aman dan terlindung dari restart aplikasi.`
	}

	if strings.Contains(q, "docker") || strings.Contains(q, "503") || strings.Contains(q, "layer") || strings.Contains(q, "corrupt") {
		return `### 🐳 Pemeliharaan Docker & Penanganan Container Glitch

Jika Anda menjumpai pesan *DOCKER_UNAVAILABLE* atau build container yang macet di VPS:

**1. Bersihkan Container yang Berhenti / Corrupted:**
` + "```bash" + `
docker container prune -f
` + "```" + `

**2. Bersihkan Docker Build Cache & Dangling Images:**
` + "```bash" + `
docker image prune -f
docker builder prune -f
` + "```" + `

**3. Periksa Status Service sPanel:**
` + "```bash" + `
systemctl status spanel
journalctl -u spanel -n 50 --no-pager
` + "```" + `

sPanel secara default juga memiliki **VPS Auto-Janitor** yang membersihkan dangling image secara terjadwal.`
	}

	if strings.Contains(q, "tailscale") || strings.Contains(q, "https") || strings.Contains(q, "insecure") || strings.Contains(q, "ip") {
		return `### 🔒 Konfigurasi Akses IP / Tailscale & Keamanan Transport

Secara default, sPanel menerapkan kebijakan keamanan ketat (*HTTPS enforcement*). 

Jika Anda mengakses server melalui IP lokal atau jaringan privat **Tailscale / VPN** tanpa sertifikat TLS:

Tambahkan environment variable berikut pada service sPanel di '/etc/systemd/system/spanel.service':
` + "```ini" + `
Environment="SPANEL_ALLOW_INSECURE_HTTP=true"
` + "```" + `

Lalu reload dan restart service:
` + "```bash" + `
systemctl daemon-reload
systemctl restart spanel
` + "```" + `

Dengan opsi ini, sPanel mengizinkan akses unencrypted HTTP melalui IP privat dan menyesuaikan cookie session agar dapat disimpan browser dengan benar.`
	}

	return `### 🚀 Selamat Datang di Dokumentasi sPanel!

**sPanel** adalah Zero-Config AI-Powered Self-Hosted PaaS untuk VPS Linux.

**Panduan Cepat:**
1. **Deploy Aplikasi:** Buka menu **Applications** > **New Project** > Pilih repositori GitHub. Nixpacks akan mendeteksi framework otomatis.
2. **Database:** Masuk ke tab **Marketplace / Database** untuk membuat PostgreSQL, MySQL, atau Redis dalam 1 klik.
3. **Environment Variables:** Kelola variabel Build-time (untuk Next.js ` + "`NEXT_PUBLIC_*`" + `) dan Runtime secara terpisah dengan enkripsi AES-256-GCM.
4. **AI DevOps:** Aktifkan BYOK Gemini / OpenAI di menu Settings untuk diagnosis log otomatis.

*Ada yang ingin Anda tanyakan lebih spesifik? Coba ketik pertanyaan seputar deployment, database, atau Docker di bawah ini!*`
}

