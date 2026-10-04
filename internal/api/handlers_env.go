package api

import (
	"strings"

	fiber "github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"spanel/internal/crypto"
	"spanel/internal/db"
)

type EnvVarItem struct {
	ID               string `json:"id"`
	Key              string `json:"key"`
	Value            string `json:"value"`
	IsSystemInjected bool   `json:"is_system_injected"`
}

type SetEnvVarInput struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type BulkEnvVarInput struct {
	RawEnv string `json:"raw_env"`
}

func (s *Server) handleListProjectEnvVars(c *fiber.Ctx) error {
	projectID := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "project not found"})
	}

	var envs []db.EnvironmentVariable
	if err := s.db.Where("project_id = ?", projectID).Order("created_at asc").Find(&envs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	items := make([]EnvVarItem, 0, len(envs))
	for _, e := range envs {
		items = append(items, EnvVarItem{
			ID:               e.ID,
			Key:              e.Key,
			Value:            "********",
			IsSystemInjected: e.IsSystemInjected,
		})
	}

	return c.JSON(items)
}

func (s *Server) handleRevealProjectEnvVar(c *fiber.Ctx) error {
	projectID := c.Params("id")
	envID := c.Params("envId")
	var env db.EnvironmentVariable
	if err := s.db.Where("project_id = ? AND id = ?", projectID, envID).First(&env).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "environment variable not found"})
	}

	decrypted, err := crypto.Decrypt(env.ValueEncrypted, s.cfg.MasterKey)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to decrypt"})
	}

	return c.JSON(fiber.Map{
		"value": decrypted,
	})
}

func (s *Server) handleSetProjectEnvVar(c *fiber.Ctx) error {
	projectID := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "project not found"})
	}

	var input SetEnvVarInput
	if err := c.BodyParser(&input); err != nil || strings.TrimSpace(input.Key) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "key is required"})
	}

	key := strings.TrimSpace(input.Key)
	val := strings.TrimSpace(input.Value)

	encVal, err := crypto.Encrypt(val, s.cfg.MasterKey)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to encrypt value"})
	}

	// Upsert
	var env db.EnvironmentVariable
	if err := s.db.Where("project_id = ? AND key = ?", projectID, key).First(&env).Error; err == nil {
		env.ValueEncrypted = encVal
		env.IsSystemInjected = false
		s.db.Save(&env)
	} else {
		env = db.EnvironmentVariable{
			ProjectID:        projectID,
			Key:              key,
			ValueEncrypted:   encVal,
			IsSystemInjected: false,
		}
		s.db.Create(&env)
	}

	return c.JSON(EnvVarItem{
		ID:               env.ID,
		Key:              env.Key,
		Value:            val,
		IsSystemInjected: env.IsSystemInjected,
	})
}

func (s *Server) handleBulkSetProjectEnvVars(c *fiber.Ctx) error {
	projectID := c.Params("id")
	var project db.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "project not found"})
	}

	var input BulkEnvVarInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	preprocessed := preprocessEnv(input.RawEnv)
	envs, _ := godotenv.Unmarshal(preprocessed)
	count := 0

	for k, v := range envs {
		k = strings.TrimSpace(k)
		if strings.HasPrefix(k, "export ") {
			k = strings.TrimSpace(strings.TrimPrefix(k, "export "))
		}
		if k == "" {
			continue
		}

		encVal, err := crypto.Encrypt(v, s.cfg.MasterKey)
		if err != nil {
			continue
		}

		var env db.EnvironmentVariable
		if err := s.db.Where("project_id = ? AND key = ?", projectID, k).First(&env).Error; err == nil {
			env.ValueEncrypted = encVal
			s.db.Save(&env)
		} else {
			env = db.EnvironmentVariable{
				ProjectID:        projectID,
				Key:              k,
				ValueEncrypted:   encVal,
				IsSystemInjected: false,
			}
			s.db.Create(&env)
		}
		count++
	}
	return c.JSON(fiber.Map{
		"message": "bulk environment variables updated",
		"count":   count,
	})
}

func preprocessEnv(raw string) string {
	var result []string
	lines := strings.Split(raw, "\n")
	inQuote := false
	var quoteChar byte

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		
		if !inQuote {
			if trimmed == "" || strings.HasPrefix(trimmed, "#") {
				result = append(result, line)
				continue
			}

			if !strings.Contains(line, "=") {
				line = line + "="
			}
		}

		for i := 0; i < len(line); i++ {
			c := line[i]
			if c == '\\' {
				i++
				continue
			}
			if c == '"' || c == '\'' {
				if !inQuote {
					inQuote = true
					quoteChar = c
				} else if quoteChar == c {
					inQuote = false
				}
			}
		}
		result = append(result, line)
	}

	return strings.Join(result, "\n")
}

func (s *Server) handleDeleteProjectEnvVar(c *fiber.Ctx) error {
	projectID := c.Params("id")
	envID := c.Params("envId")

	result := s.db.Where("project_id = ? AND id = ?", projectID, envID).Delete(&db.EnvironmentVariable{})
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "environment variable not found"})
	}

	return c.JSON(fiber.Map{
		"message": "environment variable deleted",
		"id":      envID,
	})
}
