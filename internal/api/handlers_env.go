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
	Scope            string `json:"scope"`
	IsSecret         bool   `json:"is_secret"`
}

type SetEnvVarInput struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Scope    string `json:"scope"`
	IsSecret *bool  `json:"is_secret"`
}

type BulkEnvVarInput struct {
	RawEnv   string `json:"raw_env"`
	Scope    string `json:"scope"`
	IsSecret *bool  `json:"is_secret"`
}

func normalizeScope(scope, key string) string {
	scope = strings.ToLower(strings.TrimSpace(scope))
	switch scope {
	case db.ScopeBuild, db.ScopeRuntime, db.ScopeBoth:
		return scope
	default:
		if strings.HasPrefix(key, "NEXT_PUBLIC_") {
			return db.ScopeBuild
		}
		return db.ScopeBoth
	}
}

func resolveIsSecret(key string, isSecret *bool) bool {
	// Build-time variables embedded in frontend assets must never be treated as secrets.
	if strings.HasPrefix(key, "NEXT_PUBLIC_") {
		return false
	}
	if isSecret != nil {
		return *isSecret
	}
	return true
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
		scope := e.Scope
		if scope == "" {
			scope = normalizeScope(scope, e.Key)
		}
		isSecret := e.IsSecret
		if strings.HasPrefix(e.Key, "NEXT_PUBLIC_") {
			isSecret = false
		}

		displayVal := "********"
		if !isSecret {
			if decrypted, err := crypto.Decrypt(e.ValueEncrypted, s.cfg.MasterKey, "env:"+e.ProjectID+":"+e.Key); err == nil {
				displayVal = decrypted
			}
		}

		items = append(items, EnvVarItem{
			ID:               e.ID,
			Key:              e.Key,
			Value:            displayVal,
			IsSystemInjected: e.IsSystemInjected,
			Scope:            scope,
			IsSecret:         isSecret,
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

	decrypted, err := crypto.Decrypt(env.ValueEncrypted, s.cfg.MasterKey, "env:"+env.ProjectID+":"+env.Key)
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
	scope := normalizeScope(input.Scope, key)
	isSecret := resolveIsSecret(key, input.IsSecret)

	encVal, err := crypto.Encrypt(val, s.cfg.MasterKey, "env:"+projectID+":"+key)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to encrypt value"})
	}

	// Upsert
	var env db.EnvironmentVariable
	if err := s.db.Where("project_id = ? AND key = ?", projectID, key).First(&env).Error; err == nil {
		env.ValueEncrypted = encVal
		env.IsSystemInjected = false
		env.Scope = scope
		env.IsSecret = isSecret
		s.db.Save(&env)
	} else {
		env = db.EnvironmentVariable{
			ProjectID:        projectID,
			Key:              key,
			ValueEncrypted:   encVal,
			IsSystemInjected: false,
			Scope:            scope,
			IsSecret:         isSecret,
		}
		s.db.Create(&env)
	}

	displayVal := "********"
	if !isSecret {
		displayVal = val
	}

	return c.JSON(EnvVarItem{
		ID:               env.ID,
		Key:              env.Key,
		Value:            displayVal,
		IsSystemInjected: env.IsSystemInjected,
		Scope:            env.Scope,
		IsSecret:         env.IsSecret,
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
	defaultScope := strings.TrimSpace(input.Scope)

	for k, v := range envs {
		k = strings.TrimSpace(k)
		if strings.HasPrefix(k, "export ") {
			k = strings.TrimSpace(strings.TrimPrefix(k, "export "))
		}
		if k == "" {
			continue
		}

		encVal, err := crypto.Encrypt(v, s.cfg.MasterKey, "env:"+projectID+":"+k)
		if err != nil {
			continue
		}

		scope := normalizeScope(defaultScope, k)
		isSecret := resolveIsSecret(k, input.IsSecret)

		var env db.EnvironmentVariable
		if err := s.db.Where("project_id = ? AND key = ?", projectID, k).First(&env).Error; err == nil {
			env.ValueEncrypted = encVal
			env.Scope = scope
			env.IsSecret = isSecret
			s.db.Save(&env)
		} else {
			env = db.EnvironmentVariable{
				ProjectID:        projectID,
				Key:              k,
				ValueEncrypted:   encVal,
				IsSystemInjected: false,
				Scope:            scope,
				IsSecret:         isSecret,
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
