package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	fiber "github.com/gofiber/fiber/v2"
	"spanel/internal/crypto"
	"spanel/internal/db"
)

func verifySignature(secret string, signature string, body []byte) bool {
	if secret == "" || signature == "" {
		return false
	}
	
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))
	
	return hmac.Equal([]byte(strings.TrimPrefix(signature, "sha256=")), []byte(expectedMAC))
}

type GitHubConnectInput struct {
	Token string `json:"token"`
}

type GitHubRepoItem struct {
	ID            int64       `json:"id"`
	Name          string      `json:"name"`
	FullName      string      `json:"full_name"`
	Private       bool        `json:"private"`
	HTMLURL       string      `json:"html_url"`
	Description   string      `json:"description"`
	DefaultBranch string      `json:"default_branch"`
	Language      string      `json:"language"`
	UpdatedAt     string      `json:"updated_at"`
	Owner         GitHubOwner `json:"owner"`
}

type GitHubOwner struct {
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
}

type GitHubBranchItem struct {
	Name      string `json:"name"`
	Protected bool   `json:"protected"`
}

func (s *Server) handleGitHubStatus(c *fiber.Ctx) error {
	var acc db.GitHubAccount
	if err := s.db.First(&acc, "user_id = ?", "default-admin").Error; err != nil {
		return c.JSON(fiber.Map{
			"connected": false,
		})
	}

	return c.JSON(fiber.Map{
		"connected":  true,
		"username":   acc.Username,
		"avatar_url": acc.AvatarURL,
	})
}

func (s *Server) handleGitHubConnect(c *fiber.Ctx) error {
	var input GitHubConnectInput
	if err := c.BodyParser(&input); err != nil || strings.TrimSpace(input.Token) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "GitHub Personal Access Token is required"})
	}

	token := strings.TrimSpace(input.Token)

	// Verify token with GitHub API
	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "sPanel-PaaS")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Failed to connect to GitHub API: " + err.Error()})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token GitHub tidak valid atau tidak memiliki izin akses."})
	}

	var ghUser struct {
		Login     string `json:"login"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&ghUser); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse GitHub response"})
	}

	encToken, err := crypto.Encrypt(token, s.cfg.MasterKey, "gh:default-admin")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to encrypt token"})
	}

	// Upsert account
	var acc db.GitHubAccount
	if err := s.db.First(&acc, "user_id = ?", "default-admin").Error; err == nil {
		acc.Username = ghUser.Login
		acc.AvatarURL = ghUser.AvatarURL
		acc.TokenEncrypted = encToken
		s.db.Save(&acc)
	} else {
		acc = db.GitHubAccount{
			UserID:         "default-admin",
			Username:       ghUser.Login,
			AvatarURL:      ghUser.AvatarURL,
			TokenEncrypted: encToken,
		}
		s.db.Create(&acc)
	}

	return c.JSON(fiber.Map{
		"connected":  true,
		"username":   ghUser.Login,
		"avatar_url": ghUser.AvatarURL,
	})
}

func (s *Server) handleGitHubDisconnect(c *fiber.Ctx) error {
	s.db.Where("user_id = ?", "default-admin").Delete(&db.GitHubAccount{})
	return c.JSON(fiber.Map{
		"connected": false,
		"message":   "GitHub account disconnected",
	})
}

func (s *Server) handleGitHubListRepos(c *fiber.Ctx) error {
	var acc db.GitHubAccount
	if err := s.db.First(&acc, "user_id = ?", "default-admin").Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "GitHub belum terhubung. Silakan login / hubungkan GitHub terlebih dahulu."})
	}

	token, err := crypto.Decrypt(acc.TokenEncrypted, s.cfg.MasterKey, "gh:default-admin")
	if err != nil || token == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decrypt GitHub token"})
	}

	// Fetch repos (public and private, up to 100 sorted by updated)
	reqURL := "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member"
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "sPanel-PaaS")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Failed to fetch repositories from GitHub: " + err.Error()})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Status(resp.StatusCode).JSON(fiber.Map{"error": fmt.Sprintf("GitHub API returned status %d", resp.StatusCode)})
	}

	var repos []GitHubRepoItem
	if err := json.NewDecoder(resp.Body).Decode(&repos); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse repositories JSON"})
	}

	return c.JSON(repos)
}

func (s *Server) handleGitHubListBranches(c *fiber.Ctx) error {
	owner := c.Params("owner")
	repo := c.Params("repo")
	if owner == "" || repo == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "owner and repo are required"})
	}

	var acc db.GitHubAccount
	if err := s.db.First(&acc, "user_id = ?", "default-admin").Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "GitHub belum terhubung"})
	}

	token, err := crypto.Decrypt(acc.TokenEncrypted, s.cfg.MasterKey, "gh:default-admin")
	if err != nil || token == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decrypt GitHub token"})
	}

	reqURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/branches?per_page=100", owner, repo)
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "sPanel-PaaS")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Failed to connect to GitHub API: " + err.Error()})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Status(resp.StatusCode).JSON(fiber.Map{"error": fmt.Sprintf("GitHub API returned status %d", resp.StatusCode)})
	}

	var branches []GitHubBranchItem
	if err := json.NewDecoder(resp.Body).Decode(&branches); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse branches JSON"})
	}

	return c.JSON(branches)
}

type GitHubPushPayload struct {
	Ref        string `json:"ref"`
	After      string `json:"after"`
	HeadCommit struct {
		ID      string `json:"id"`
		Message string `json:"message"`
	} `json:"head_commit"`
	Repository struct {
		FullName string `json:"full_name"`
		Name     string `json:"name"`
	} `json:"repository"`
}

func (s *Server) handleGitHubWebhook(c *fiber.Ctx) error {
	event := c.Get("X-GitHub-Event")
	if event == "ping" {
		return c.JSON(fiber.Map{"message": "pong", "status": "active"})
	}

	var payload GitHubPushPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid webhook payload"})
	}

	repoFullName := strings.ToLower(strings.TrimSpace(payload.Repository.FullName))
	if repoFullName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "repository.full_name is missing"})
	}

	branch := strings.TrimPrefix(payload.Ref, "refs/heads/")
	if branch == "" {
		branch = "main"
	}

	var projects []db.Project
	if err := s.db.Where("LOWER(repo_fullname) = ?", repoFullName).Find(&projects).Error; err != nil || len(projects) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": fmt.Sprintf("no project found for repo %s", repoFullName)})
	}

	var triggeredCount int
	var lastDeploymentID string
	now := time.Now()

	for _, project := range projects {
		if project.Branch != "" && project.Branch != branch {
			continue
		}

		commitHash := payload.HeadCommit.ID
		if commitHash == "" {
			commitHash = payload.After
		}
		if commitHash == "" {
			commitHash = "HEAD"
		}

		commitMsg := payload.HeadCommit.Message
		if commitMsg == "" {
			commitMsg = fmt.Sprintf("Auto-deploy from GitHub push to %s", branch)
		}

		deployment := db.Deployment{
			ProjectID:     project.ID,
			CommitHash:    commitHash,
			CommitMessage: commitMsg,
			Status:        "queued",
			StartedAt:     &now,
		}

		if err := s.db.Create(&deployment).Error; err == nil {
			_, _ = s.queue.Enqueue("deploy", deployment.ID)
			triggeredCount++
			lastDeploymentID = deployment.ID
		}
	}

	if triggeredCount == 0 {
		return c.JSON(fiber.Map{
			"message": fmt.Sprintf("Push event received for branch %s, but no project matched this branch.", branch),
		})
	}

	return c.JSON(fiber.Map{
		"message":         fmt.Sprintf("Auto-deployment triggered for %d project(s)", triggeredCount),
		"deployment_id":   lastDeploymentID,
		"triggered_count": triggeredCount,
	})
}

func (s *Server) handleProjectWebhook(c *fiber.Ctx) error {
	id := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "project not found"})
	}

	event := c.Get("X-GitHub-Event")
	if event == "ping" {
		return c.JSON(fiber.Map{"message": "pong", "project": project.Name})
	}

	if project.WebhookSecret != "" {
		signature := c.Get("X-Hub-Signature-256")
		if !verifySignature(project.WebhookSecret, signature, c.Body()) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid webhook signature"})
		}
	}

	var payload GitHubPushPayload
	_ = c.BodyParser(&payload)

	commitHash := payload.HeadCommit.ID
	if commitHash == "" {
		commitHash = payload.After
	}
	if commitHash == "" {
		commitHash = "HEAD"
	}

	commitMsg := payload.HeadCommit.Message
	if commitMsg == "" {
		commitMsg = "Triggered via Webhook"
	}

	now := time.Now()
	deployment := db.Deployment{
		ProjectID:     project.ID,
		CommitHash:    commitHash,
		CommitMessage: commitMsg,
		Status:        "queued",
		StartedAt:     &now,
	}

	if err := s.db.Create(&deployment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	_, err := s.queue.Enqueue("deploy", deployment.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to enqueue deploy job"})
	}

	return c.JSON(fiber.Map{
		"message":       "Auto-deployment queued successfully",
		"deployment_id": deployment.ID,
		"project_id":    project.ID,
	})
}

