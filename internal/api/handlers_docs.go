package api

import (
	"context"
	"strings"
	"time"

	fiber "github.com/gofiber/fiber/v2"
	"spanel/internal/crypto"
	"spanel/internal/db"
)

type DocsChatInput struct {
	Question string `json:"question"`
}

type DocsChatResponse struct {
	Answer   string `json:"answer"`
	Provider string `json:"provider"`
}

// handleDocsChat handles public / authenticated questions about sPanel documentation
func (s *Server) handleDocsChat(c *fiber.Ctx) error {
	var input DocsChatInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Format payload tidak valid",
		})
	}

	question := strings.TrimSpace(input.Question)
	if question == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Pertanyaan tidak boleh kosong",
		})
	}

	// Rate limit check / length check
	if len(question) > 2000 {
		question = question[:2000]
	}

	provider := ""
	apiKey := ""

	// Check if user has configured AI credentials
	if s.db != nil {
		var prov db.AIProvider
		if err := s.db.First(&prov, "user_id = ?", "default-admin").Error; err == nil {
			decrypted, err := crypto.Decrypt(prov.APIKeyEncrypted, s.cfg.MasterKey, "ai:default-admin")
			if err == nil && decrypted != "" {
				provider = prov.ProviderName
				apiKey = decrypted
			}
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	var answer string
	var err error
	activeProvider := "knowledge_base"

	if s.aiAgent != nil && apiKey != "" {
		answer, err = s.aiAgent.AnswerDocsQuestion(ctx, provider, apiKey, question)
		if err == nil && answer != "" {
			activeProvider = provider
		}
	}

	if answer == "" || err != nil {
		if s.aiAgent != nil {
			answer = s.aiAgent.GetLocalDocsAnswer(question)
		} else {
			answer = "Maaf, sistem asisten dokumentasi sedang tidak tersedia."
		}
		activeProvider = "knowledge_base"
	}

	return c.JSON(DocsChatResponse{
		Answer:   answer,
		Provider: activeProvider,
	})
}
