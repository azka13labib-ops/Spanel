package db

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BaseModel struct {
	ID        string         `gorm:"type:text;primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}

type User struct {
	BaseModel
	Username     string `gorm:"uniqueIndex;not null" json:"username"`
	Email        string `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string `gorm:"not null" json:"-"`

	Projects            []Project                `gorm:"foreignKey:UserID" json:"projects,omitempty"`
	AIProviders         []AIProvider             `gorm:"foreignKey:UserID" json:"ai_providers,omitempty"`
	GitHubAccounts      []GitHubAccount          `gorm:"foreignKey:UserID" json:"github_accounts,omitempty"`
	GitHubInstallations []GitHubAppInstallation  `gorm:"foreignKey:UserID" json:"github_installations,omitempty"`
	MarketplaceServices []MarketplaceService     `gorm:"foreignKey:UserID" json:"marketplace_services,omitempty"`
}

type GitHubAccount struct {
	BaseModel
	UserID         string `gorm:"index;not null" json:"user_id"`
	Username       string `gorm:"not null" json:"username"`
	AvatarURL      string `json:"avatar_url"`
	TokenEncrypted string `gorm:"not null" json:"-"`
}

type AIProvider struct {
	BaseModel
	UserID          string `gorm:"index;not null" json:"user_id"`
	ProviderName    string `gorm:"not null" json:"provider_name"` // "openai", "gemini", "anthropic"
	APIKeyEncrypted string `gorm:"not null" json:"-"`
}

type GitHubAppInstallation struct {
	BaseModel
	UserID         string `gorm:"index;not null" json:"user_id"`
	InstallationID string `gorm:"not null" json:"installation_id"`
	AccountName    string `gorm:"not null" json:"account_name"`

	Projects []Project `gorm:"foreignKey:GitHubInstallationID" json:"projects,omitempty"`
}

type Project struct {
	BaseModel
	UserID               string  `gorm:"index;not null" json:"user_id"`
	GitHubInstallationID *string `gorm:"index" json:"github_installation_id"`
	Name                 string  `gorm:"uniqueIndex;not null" json:"name"`
	RepoFullName         string  `gorm:"not null" json:"repo_fullname"`
	Branch               string  `gorm:"default:'main'" json:"branch"`
	CustomDomain         string  `json:"custom_domain"`
	MagicDomain          string  `json:"magic_domain"`
	TargetPort           int     `gorm:"default:3000" json:"target_port"`
	HealthcheckPath      string  `gorm:"default:'/'" json:"healthcheck_path"`
	MemoryLimitMB        int     `gorm:"default:512" json:"memory_limit_mb"`
	CPULimit             float64 `gorm:"default:1.0" json:"cpu_limit"`
	DockerNetwork        string  `json:"docker_network"`
	AIMode               string  `gorm:"default:'supervised'" json:"ai_mode"` // "supervised", "autonomous"
	Status               string  `gorm:"default:'idle'" json:"status"`        // "idle", "running", "stopped", "error"
	WebhookSecret        string  `json:"webhook_secret"`

	EnvVars     []EnvironmentVariable `gorm:"foreignKey:ProjectID" json:"env_vars,omitempty"`
	Volumes     []Volume              `gorm:"foreignKey:ProjectID" json:"volumes,omitempty"`
	Deployments []Deployment          `gorm:"foreignKey:ProjectID" json:"deployments,omitempty"`
}

type EnvironmentVariable struct {
	BaseModel
	ProjectID        string `gorm:"index;not null" json:"project_id"`
	Key              string `gorm:"not null" json:"key"`
	ValueEncrypted   string `gorm:"not null" json:"-"`
	IsSystemInjected bool   `gorm:"default:false" json:"is_system_injected"`
}

type Volume struct {
	BaseModel
	ProjectID     string `gorm:"index;not null" json:"project_id"`
	Name          string `gorm:"not null" json:"name"`
	ContainerPath string `gorm:"not null" json:"container_path"`
	HostPath      string `gorm:"not null" json:"host_path"`
}

type Deployment struct {
	BaseModel
	ProjectID     string     `gorm:"index;not null" json:"project_id"`
	CommitHash    string     `json:"commit_hash"`
	CommitMessage string     `json:"commit_message"`
	ImageHash     string     `json:"image_hash"`
	Status        string     `gorm:"default:'queued'" json:"status"` // "queued", "building", "healthy", "failed", "rolled_back"
	LogFilePath   string     `json:"log_file_path"`
	RetryCount    int        `gorm:"default:0" json:"retry_count"`
	StartedAt     *time.Time `json:"started_at"`
	FinishedAt    *time.Time `json:"finished_at"`

	Remediation *AIRemediation `gorm:"foreignKey:DeploymentID" json:"remediation,omitempty"`
}

type InternalQueueJob struct {
	BaseModel
	JobType    string `gorm:"not null" json:"job_type"` // "deploy", "rollback", "ai_analyze", "janitor_prune"
	TargetID   string `gorm:"not null" json:"target_id"`
	Status     string `gorm:"default:'pending';index" json:"status"` // "pending", "processing", "completed", "failed"
	ErrorTrace string `gorm:"type:text" json:"error_trace"`
}

type AIRemediation struct {
	BaseModel
	DeploymentID        string `gorm:"index;not null" json:"deployment_id"`
	ErrorCategory       string `json:"error_category"` // "config_issue", "code_issue", "oom_killed", "port_mismatch"
	AIAnalysis          string `gorm:"type:text" json:"ai_analysis"`
	SuggestedConfigJSON string `gorm:"type:text" json:"suggested_config_json"`
	PRURL               string `json:"pr_url"`
	IsApplied           bool   `gorm:"default:false" json:"is_applied"`
}

type MarketplaceService struct {
	BaseModel
	UserID               string `gorm:"index;not null" json:"user_id"`
	ServiceName          string `gorm:"not null" json:"service_name"` // "postgresql", "mysql", "redis"
	ContainerID          string `json:"container_id"`
	InternalHostname     string `json:"internal_hostname"`
	InternalPort         int    `json:"internal_port"`
	CredentialsEncrypted string `gorm:"type:text" json:"-"`
	VolumeHostPath       string `json:"volume_host_path"`
	Status               string `gorm:"default:'running'" json:"status"`
}
