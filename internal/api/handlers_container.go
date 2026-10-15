package api

import (
	"bufio"
	"bytes"
	"encoding/json"
	"os/exec"
	"strings"

	fiber "github.com/gofiber/fiber/v2"
	"spanel/internal/db"
)

type ContainerInfo struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	ProjectID       string `json:"project_id,omitempty"`
	ProjectName     string `json:"project_name,omitempty"`
	Image           string `json:"image"`
	State           string `json:"state"`
	Status          string `json:"status"`
	Ports           string `json:"ports"`
	CreatedAt       string `json:"created_at"` 
	IsSpanelManaged bool   `json:"is_spanel_managed"`
	IsDatabase      bool   `json:"is_database"`
}

type dockerPSItem struct {
	ID        string `json:"ID"`
	Names     string `json:"Names"`
	Image     string `json:"Image"`
	State     string `json:"State"`
	Status    string `json:"Status"`
	Ports     string `json:"Ports"`
	CreatedAt string `json:"CreatedAt"`
}

func (s *Server) getRawDockerContainers() []ContainerInfo {
	cmd := exec.Command("docker", "ps", "-a", "--format", "{{json .}}")
	out, err := cmd.Output()
	if err != nil {
		// Fallback to active containers if -a encounters dangling or corrupted metadata
		cmdRunning := exec.Command("docker", "ps", "--format", "{{json .}}")
		if fallbackOut, fallbackErr := cmdRunning.Output(); fallbackErr == nil {
			out = fallbackOut
		} else {
			return []ContainerInfo{}
		}
	}

	var projects []db.Project
	_ = s.db.Select("id, name").Find(&projects)
	projectMap := make(map[string]string)
	for _, p := range projects {
		projectMap[p.Name] = p.ID
	}

	var containers []ContainerInfo
	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		var item dockerPSItem
		if err := json.Unmarshal([]byte(line), &item); err != nil {
			continue
		}

		name := strings.TrimPrefix(item.Names, "/")
		cID := item.ID
		if len(cID) > 12 {
			cID = cID[:12]
		}

		info := ContainerInfo{
			ID:        cID,
			Name:      name,
			Image:     item.Image,
			State:     strings.ToLower(item.State),
			Status:    item.Status,
			Ports:     item.Ports,
			CreatedAt: item.CreatedAt,
		}

		if strings.HasPrefix(name, "spanel-app-") {
			pName := strings.TrimPrefix(name, "spanel-app-")
			info.ProjectName = pName
			info.IsSpanelManaged = true
			if pID, ok := projectMap[pName]; ok {
				info.ProjectID = pID
			}
		} else if strings.HasPrefix(name, "spanel-db-") {
			info.IsSpanelManaged = true
			info.IsDatabase = true
		} else if strings.HasPrefix(name, "spanel-") {
			info.IsSpanelManaged = true
		}

		containers = append(containers, info)
	}

	if containers == nil {
		containers = []ContainerInfo{}
	}
	return containers
}

func (s *Server) handleListContainers(c *fiber.Ctx) error {
	containers := s.getRawDockerContainers()
	return c.JSON(containers)
}

func (s *Server) handleContainerAction(c *fiber.Ctx) error {
	id := strings.TrimSpace(c.Params("id"))
	action := strings.ToLower(strings.TrimSpace(c.Params("action")))

	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Container ID is required"})
	}

	target := strings.TrimPrefix(id, "ext-")
	if action != "start" && action != "stop" && action != "restart" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid action. Supported: start, stop, restart"})
	}

	cmd := exec.Command("docker", action, target)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":  "Docker action failed: " + strings.TrimSpace(string(out)),
			"detail": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "Container " + target + " " + action + "ed successfully",
	})
}

