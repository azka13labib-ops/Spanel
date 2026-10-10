package config

var (
	// Version is injected at build time via:
	// -ldflags "-X 'spanel/internal/config.Version=v1.0.0'"
	Version   = "v1.0.0"
	GitCommit = "dev"
	BuildDate = ""
)
