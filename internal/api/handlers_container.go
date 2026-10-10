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

func (s *Server) handleListContainers(c *fiber.Ctx) error {
	cmd := exec.Command("docker", "ps", "-a", "--format", "{{json .}}")
	out, err := cmd.Output()
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":      "DOCKER_UNAVAILABLE",
			"message":    "Docker daemon is not running or not reachable on this host",
			"containers": []ContainerInfo{},
		})
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

	return c.JSON(containers)
}
