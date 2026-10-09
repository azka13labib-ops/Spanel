package api

import (
	"fmt"
	"strings"

	fiber "github.com/gofiber/fiber/v2"
	"spanel/internal/crypto"
	"spanel/internal/db"
)

type SaveAIConfigInput struct {
	ProviderName string `json:"provider_name"`
	APIKey       string `json:"api_key"`
}

type TestAIConfigInput struct {
	ProviderName string `json:"provider_name"`
	APIKey       string `json:"api_key"`
}

func maskAPIKey(key string) string {
	if len(key) <= 8 {
		return "••••••••"
	}
	return key[:4] + "••••••••" + key[len(key)-4:]
}

func (s *Server) handleGetAIConfig(c *fiber.Ctx) error {
	var prov db.AIProvider
	if err := s.db.First(&prov, "user_id = ?", "default-admin").Error; err != nil {
		return c.JSON(fiber.Map{
			"is_configured": false,
			"provider_name": "",
			"masked_key":    "",
		})
	}

	decrypted, err := crypto.Decrypt(prov.APIKeyEncrypted, s.cfg.MasterKey, "ai:default-admin")
	if err != nil || decrypted == "" {
		return c.JSON(fiber.Map{
			"is_configured": false,
			"provider_name": prov.ProviderName,
			"masked_key":    "",
		})
	}

	return c.JSON(fiber.Map{
		"is_configured": true,
		"provider_name": prov.ProviderName,
		"masked_key":    maskAPIKey(decrypted),
	})
}

func (s *Server) handleSaveAIConfig(c *fiber.Ctx) error {
	var input SaveAIConfigInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format payload tidak valid"})
	}

	input.ProviderName = strings.ToLower(strings.TrimSpace(input.ProviderName))
	input.APIKey = strings.TrimSpace(input.APIKey)

	if input.ProviderName != "gemini" && input.ProviderName != "openai" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Provider AI harus 'gemini' atau 'openai'",
		})
	}

	if input.APIKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "API Key tidak boleh kosong",
		})
	}

	encKey, err := crypto.Encrypt(input.APIKey, s.cfg.MasterKey, "ai:default-admin")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Gagal mengenkripsi API Key: %v", err),
		})
	}

	var existing db.AIProvider
	if err := s.db.First(&existing, "user_id = ?", "default-admin").Error; err == nil {
		existing.ProviderName = input.ProviderName
		existing.APIKeyEncrypted = encKey
		if err := s.db.Save(&existing).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Gagal memperbarui konfigurasi AI",
			})
		}
	} else {
		newProv := db.AIProvider{
			UserID:          "default-admin",
			ProviderName:    input.ProviderName,
			APIKeyEncrypted: encKey,
		}
		if err := s.db.Create(&newProv).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Gagal menyimpan konfigurasi AI",
			})
		}
	}

	return c.JSON(fiber.Map{
		"status":        "success",
		"message":       "Konfigurasi AI berhasil disimpan dengan enkripsi AES-256-GCM",
		"provider_name": input.ProviderName,
		"masked_key":    maskAPIKey(input.APIKey),
	})
}

func (s *Server) handleDeleteAIConfig(c *fiber.Ctx) error {
	if err := s.db.Where("user_id = ?", "default-admin").Delete(&db.AIProvider{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal menghapus konfigurasi AI",
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Konfigurasi AI berhasil dihapus",
	})
}

func (s *Server) handleTestAIConfig(c *fiber.Ctx) error {
	var input TestAIConfigInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format payload tidak valid"})
	}

	provider := strings.ToLower(strings.TrimSpace(input.ProviderName))
	key := strings.TrimSpace(input.APIKey)

	// If no key provided in body, fallback to saved key from database
	if key == "" {
		var prov db.AIProvider
		if err := s.db.First(&prov, "user_id = ?", "default-admin").Error; err == nil {
			if provider == "" {
				provider = prov.ProviderName
			}
			decrypted, err := crypto.Decrypt(prov.APIKeyEncrypted, s.cfg.MasterKey, "ai:default-admin")
			if err == nil && decrypted != "" {
				key = decrypted
			}
		}
	}

	if provider == "" {
		provider = "gemini"
	}

	if key == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error":  "API Key belum dimasukkan atau belum disimpan di database",
		})
	}

	msg, err := s.aiAgent.TestConnection(c.Context(), provider, key)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error":  err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": msg,
	})
}
