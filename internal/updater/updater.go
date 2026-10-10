package updater

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"spanel/internal/config"
)

type GitHubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

type GitHubRelease struct {
	TagName     string        `json:"tag_name"`
	Name        string        `json:"name"`
	Body        string        `json:"body"`
	HTMLURL     string        `json:"html_url"`
	PublishedAt string        `json:"published_at"`
	Assets      []GitHubAsset `json:"assets"`
}

type VersionInfo struct {
	CurrentVersion string `json:"current_version"`
	LatestVersion  string `json:"latest_version"`
	HasUpdate      bool   `json:"has_update"`
	ReleaseName    string `json:"release_name"`
	ReleaseNotes   string `json:"release_notes"`
	ReleaseURL     string `json:"release_url"`
	PublishedAt    string `json:"published_at"`
	CheckedAt      string `json:"checked_at"`
}

type Updater struct {
	repoOwner string
	repoName  string
	client    *http.Client
	mu        sync.RWMutex
	cached    *VersionInfo
	lastCheck time.Time
	cacheTTL  time.Duration
}

func NewUpdater(repoOwner, repoName string) *Updater {
	return &Updater{
		repoOwner: repoOwner,
		repoName:  repoName,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		cacheTTL: 30 * time.Minute,
	}
}

// CompareSemver compares two semantic versions (e.g. "v1.0.0" and "v1.1.0").
// Returns:
//
//	-1 if v1 < v2
//	 0 if v1 == v2
//	 1 if v1 > v2
func CompareSemver(v1, v2 string) int {
	clean1 := strings.TrimPrefix(strings.TrimSpace(v1), "v")
	clean2 := strings.TrimPrefix(strings.TrimSpace(v2), "v")

	parts1 := strings.Split(strings.Split(clean1, "-")[0], ".")
	parts2 := strings.Split(strings.Split(clean2, "-")[0], ".")

	maxLen := len(parts1)
	if len(parts2) > maxLen {
		maxLen = len(parts2)
	}

	for i := 0; i < maxLen; i++ {
		var num1, num2 int
		if i < len(parts1) {
			num1, _ = strconv.Atoi(parts1[i])
		}
		if i < len(parts2) {
			num2, _ = strconv.Atoi(parts2[i])
		}

		if num1 < num2 {
			return -1
		}
		if num1 > num2 {
			return 1
		}
	}

	return 0
}

// CheckUpdate checks GitHub for the latest release
func (u *Updater) CheckUpdate(force bool) (*VersionInfo, error) {
	u.mu.Lock()
	defer u.mu.Unlock()

	// Return cached if within TTL and not forced
	if !force && u.cached != nil && time.Since(u.lastCheck) < u.cacheTTL {
		return u.cached, nil
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", u.repoOwner, u.repoName)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create update request: %w", err)
	}

	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", fmt.Sprintf("sPanel-Updater/%s (%s; %s)", config.Version, runtime.GOOS, runtime.GOARCH))

	resp, err := u.client.Do(req)
	if err != nil {
		// If offline or network error, return existing cache if available
		if u.cached != nil {
			return u.cached, nil
		}
		return &VersionInfo{
			CurrentVersion: config.Version,
			LatestVersion:  config.Version,
			HasUpdate:      false,
			CheckedAt:      time.Now().Format(time.RFC3339),
		}, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		// Repository has no releases yet
		info := &VersionInfo{
			CurrentVersion: config.Version,
			LatestVersion:  config.Version,
			HasUpdate:      false,
			ReleaseName:    "Development Build",
			ReleaseNotes:   "No published releases found on GitHub repository.",
			CheckedAt:      time.Now().Format(time.RFC3339),
		}
		u.cached = info
		u.lastCheck = time.Now()
		return info, nil
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API returned status %d: %s", resp.StatusCode, string(body))
	}

	var release GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("failed to decode GitHub release response: %w", err)
	}

	hasUpdate := false
	if release.TagName != "" && config.Version != "dev" {
		if CompareSemver(config.Version, release.TagName) < 0 {
			hasUpdate = true
		}
	}

	info := &VersionInfo{
		CurrentVersion: config.Version,
		LatestVersion:  release.TagName,
		HasUpdate:      hasUpdate,
		ReleaseName:    release.Name,
		ReleaseNotes:   release.Body,
		ReleaseURL:     release.HTMLURL,
		PublishedAt:    release.PublishedAt,
		CheckedAt:      time.Now().Format(time.RFC3339),
	}

	u.cached = info
	u.lastCheck = time.Now()
	return info, nil
}

// PerformSelfUpdate downloads the latest release binary for the current OS/Arch and replaces the running binary
func (u *Updater) PerformSelfUpdate() error {
	if runtime.GOOS != "linux" {
		return fmt.Errorf("self-update is currently supported on Linux VPS hosts only")
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", u.repoOwner, u.repoName)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "sPanel-Updater")

	resp, err := u.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to check release for update: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	var release GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return fmt.Errorf("failed to decode release: %w", err)
	}

	// Look for matching binary asset
	// Preferred patterns: spanel_linux_amd64, spanel_linux_arm64, spanel_linux
	var downloadURL string
	targetArch := runtime.GOARCH

	for _, asset := range release.Assets {
		name := strings.ToLower(asset.Name)
		if strings.Contains(name, "linux") {
			if strings.Contains(name, targetArch) {
				downloadURL = asset.BrowserDownloadURL
				break
			} else if !strings.Contains(name, "arm") && !strings.Contains(name, "386") && targetArch == "amd64" {
				downloadURL = asset.BrowserDownloadURL
			}
		}
	}

	if downloadURL == "" {
		return fmt.Errorf("no compatible Linux binary found for architecture %s in release %s", targetArch, release.TagName)
	}

	currentExec, err := os.Executable()
	if err != nil {
		return fmt.Errorf("unable to determine current executable path: %w", err)
	}
	currentExec, err = filepath.EvalSymlinks(currentExec)
	if err != nil {
		return fmt.Errorf("unable to resolve executable symlinks: %w", err)
	}

	log.Printf("[UPDATER] Downloading update from %s to update %s...", downloadURL, currentExec)

	// Download new binary to temporary file
	tempFile := currentExec + ".new"
	out, err := os.OpenFile(tempFile, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0755)
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}

	binResp, err := http.Get(downloadURL)
	if err != nil {
		out.Close()
		_ = os.Remove(tempFile)
		return fmt.Errorf("failed to download binary: %w", err)
	}
	defer binResp.Body.Close()

	if binResp.StatusCode != http.StatusOK {
		out.Close()
		_ = os.Remove(tempFile)
		return fmt.Errorf("download failed with HTTP status %d", binResp.StatusCode)
	}

	if _, err := io.Copy(out, binResp.Body); err != nil {
		out.Close()
		_ = os.Remove(tempFile)
		return fmt.Errorf("failed to save downloaded binary: %w", err)
	}
	out.Close()

	// Verify header of new file (must be ELF)
	headerBytes := make([]byte, 4)
	f, err := os.Open(tempFile)
	if err == nil {
		_, _ = f.Read(headerBytes)
		f.Close()
	}
	if string(headerBytes) != "\x7fELF" {
		_ = os.Remove(tempFile)
		return fmt.Errorf("downloaded file is not a valid Linux ELF executable")
	}

	// Rename current executable to .old and move .new to currentExec
	oldBackup := currentExec + ".old"
	_ = os.Remove(oldBackup) // Remove any previous backup

	if err := os.Rename(currentExec, oldBackup); err != nil {
		_ = os.Remove(tempFile)
		return fmt.Errorf("failed to backup current binary: %w", err)
	}

	if err := os.Rename(tempFile, currentExec); err != nil {
		// Rollback if possible
		_ = os.Rename(oldBackup, currentExec)
		return fmt.Errorf("failed to replace binary with updated version: %w", err)
	}

	_ = os.Chmod(currentExec, 0755)
	log.Printf("[UPDATER] Successfully replaced binary with %s. Triggering service restart...", release.TagName)

	// Trigger restart in background
	go func() {
		time.Sleep(1 * time.Second)
		// Try systemctl restart spanel
		cmd := exec.Command("systemctl", "restart", "spanel")
		if err := cmd.Start(); err != nil {
			log.Printf("[UPDATER] systemctl restart returned %v; exiting process for systemd supervisor restart", err)
			os.Exit(0)
		}
	}()

	return nil
}
