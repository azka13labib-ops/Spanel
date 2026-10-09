package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	fiber "github.com/gofiber/fiber/v2"
	"spanel/internal/crypto"
	"spanel/internal/db"
)

type SaveDNSConfigInput struct {
	APIToken string `json:"api_token"`
}

type CreateDNSRecordInput struct {
	Type     string `json:"type"`
	Name     string `json:"name"`
	Content  string `json:"content"`
	TTL      int    `json:"ttl"`
	Proxied  bool   `json:"proxied"`
	Comment  string `json:"comment"`
	Priority *int   `json:"priority,omitempty"`
}

type QuickPointInput struct {
	Subdomain string `json:"subdomain"`
	Proxied   bool   `json:"proxied"`
	Comment   string `json:"comment"`
}

func maskToken(token string) string {
	if len(token) <= 8 {
		return "••••••••"
	}
	return token[:4] + "••••••••" + token[len(token)-4:]
}

func (s *Server) getCloudflareToken() (string, error) {
	var prov db.DNSProvider
	if err := s.db.First(&prov, "user_id = ? AND provider_type = ?", "default-admin", "cloudflare").Error; err != nil {
		return "", fmt.Errorf("Cloudflare API Token belum dikonfigurasi")
	}

	token, err := crypto.Decrypt(prov.APITokenEncrypted, s.cfg.MasterKey, "dns:default-admin")
	if err != nil || token == "" {
		return "", fmt.Errorf("gagal mendekripsi Cloudflare API Token")
	}

	return token, nil
}

func (s *Server) handleGetDNSConfig(c *fiber.Ctx) error {
	var prov db.DNSProvider
	if err := s.db.First(&prov, "user_id = ? AND provider_type = ?", "default-admin", "cloudflare").Error; err != nil {
		return c.JSON(fiber.Map{
			"is_configured": false,
			"masked_token":  "",
		})
	}

	token, err := crypto.Decrypt(prov.APITokenEncrypted, s.cfg.MasterKey, "dns:default-admin")
	if err != nil || token == "" {
		return c.JSON(fiber.Map{
			"is_configured": false,
			"masked_token":  "",
		})
	}

	return c.JSON(fiber.Map{
		"is_configured": true,
		"masked_token":  maskToken(token),
	})
}

func (s *Server) handleSaveDNSConfig(c *fiber.Ctx) error {
	var input SaveDNSConfigInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	token := strings.TrimSpace(input.APIToken)
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cloudflare API Token tidak boleh kosong"})
	}

	// Verify token against Cloudflare API
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", "https://api.cloudflare.com/client/v4/user/tokens/verify", nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Gagal menghubungi Cloudflare: %v", err),
		})
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var verifyResp struct {
		Success  bool `json:"success"`
		Messages []struct {
			Message string `json:"message"`
		} `json:"messages"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	_ = json.Unmarshal(bodyBytes, &verifyResp)

	if resp.StatusCode != http.StatusOK || !verifyResp.Success {
		errMsg := "Token Cloudflare tidak valid"
		if len(verifyResp.Errors) > 0 {
			errMsg = verifyResp.Errors[0].Message
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Verifikasi gagal (%d): %s", resp.StatusCode, errMsg),
		})
	}

	encToken, err := crypto.Encrypt(token, s.cfg.MasterKey, "dns:default-admin")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengenkripsi token Cloudflare",
		})
	}

	var existing db.DNSProvider
	if err := s.db.First(&existing, "user_id = ? AND provider_type = ?", "default-admin", "cloudflare").Error; err == nil {
		existing.APITokenEncrypted = encToken
		s.db.Save(&existing)
	} else {
		newProv := db.DNSProvider{
			UserID:            "default-admin",
			ProviderType:      "cloudflare",
			APITokenEncrypted: encToken,
		}
		s.db.Create(&newProv)
	}

	return c.JSON(fiber.Map{
		"status":       "success",
		"message":      "Cloudflare API Token berhasil diverifikasi dan disimpan!",
		"masked_token": maskToken(token),
	})
}

func (s *Server) handleDeleteDNSConfig(c *fiber.Ctx) error {
	s.db.Where("user_id = ? AND provider_type = ?", "default-admin", "cloudflare").Delete(&db.DNSProvider{})
	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Konfigurasi Cloudflare DNS berhasil dihapus",
	})
}

func (s *Server) handleListDNSZones(c *fiber.Ctx) error {
	token, err := s.getCloudflareToken()
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("GET", "https://api.cloudflare.com/client/v4/zones?per_page=50", nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Gagal terhubung ke Cloudflare: " + err.Error()})
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var cfResp struct {
		Success bool `json:"success"`
		Result  []struct {
			ID          string   `json:"id"`
			Name        string   `json:"name"`
			Status      string   `json:"status"`
			NameServers []string `json:"name_servers"`
		} `json:"result"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.Unmarshal(bodyBytes, &cfResp); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal parsing respon Cloudflare"})
	}

	if !cfResp.Success {
		errMsg := "Gagal mengambil daftar domain"
		if len(cfResp.Errors) > 0 {
			errMsg = cfResp.Errors[0].Message
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errMsg})
	}

	return c.JSON(cfResp.Result)
}

func (s *Server) handleListDNSRecords(c *fiber.Ctx) error {
	zoneID := c.Params("zoneId")
	if zoneID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "zoneId diperlukan"})
	}

	token, err := s.getCloudflareToken()
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records?per_page=100", zoneID)
	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var cfResp struct {
		Success bool          `json:"success"`
		Result  []interface{} `json:"result"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	_ = json.Unmarshal(bodyBytes, &cfResp)

	if !cfResp.Success {
		errMsg := "Gagal mengambil DNS records"
		if len(cfResp.Errors) > 0 {
			errMsg = cfResp.Errors[0].Message
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errMsg})
	}

	return c.JSON(cfResp.Result)
}

func (s *Server) handleCreateDNSRecord(c *fiber.Ctx) error {
	zoneID := c.Params("zoneId")
	if zoneID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "zoneId diperlukan"})
	}

	var input CreateDNSRecordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	input.Type = strings.ToUpper(strings.TrimSpace(input.Type))
	input.Name = strings.TrimSpace(input.Name)
	input.Content = strings.TrimSpace(input.Content)

	if input.Type == "" || input.Name == "" || input.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Type, Name, dan Content harus diisi"})
	}

	if input.TTL <= 0 {
		input.TTL = 1 // 1 = Auto di Cloudflare
	}

	token, err := s.getCloudflareToken()
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records", zoneID)
	payloadBytes, _ := json.Marshal(input)

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var cfResp struct {
		Success bool        `json:"success"`
		Result  interface{} `json:"result"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	_ = json.Unmarshal(bodyBytes, &cfResp)

	if !cfResp.Success {
		errMsg := "Gagal membuat DNS record"
		if len(cfResp.Errors) > 0 {
			errMsg = cfResp.Errors[0].Message
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errMsg})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "DNS record berhasil ditambahkan!",
		"result":  cfResp.Result,
	})
}

func (s *Server) handleDeleteDNSRecord(c *fiber.Ctx) error {
	zoneID := c.Params("zoneId")
	recordID := c.Params("recordId")
	if zoneID == "" || recordID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "zoneId dan recordId diperlukan"})
	}

	token, err := s.getCloudflareToken()
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records/%s", zoneID, recordID)
	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var cfResp struct {
		Success bool `json:"success"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	_ = json.Unmarshal(bodyBytes, &cfResp)

	if !cfResp.Success {
		errMsg := "Gagal menghapus DNS record"
		if len(cfResp.Errors) > 0 {
			errMsg = cfResp.Errors[0].Message
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errMsg})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "DNS record berhasil dihapus!",
	})
}

func (s *Server) handleQuickPointDNSRecord(c *fiber.Ctx) error {
	zoneID := c.Params("zoneId")
	if zoneID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "zoneId diperlukan"})
	}

	var input QuickPointInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload tidak valid"})
	}

	subdomain := strings.TrimSpace(input.Subdomain)
	if subdomain == "" {
		subdomain = "@"
	}

	comment := input.Comment
	if comment == "" {
		comment = "Auto-pointed to sPanel Host (" + s.cfg.HostIP + ")"
	}

	recordInput := CreateDNSRecordInput{
		Type:    "A",
		Name:    subdomain,
		Content: s.cfg.HostIP,
		TTL:     1, // Auto
		Proxied: input.Proxied,
		Comment: comment,
	}

	token, err := s.getCloudflareToken()
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records", zoneID)
	payloadBytes, _ := json.Marshal(recordInput)

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var cfResp struct {
		Success bool        `json:"success"`
		Result  interface{} `json:"result"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	_ = json.Unmarshal(bodyBytes, &cfResp)

	if !cfResp.Success {
		errMsg := "Gagal mengarahkan DNS record"
		if len(cfResp.Errors) > 0 {
			errMsg = cfResp.Errors[0].Message
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errMsg})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": fmt.Sprintf("Record A untuk '%s' berhasil diarahkan ke IP sPanel (%s)!", subdomain, s.cfg.HostIP),
		"result":  cfResp.Result,
	})
}
