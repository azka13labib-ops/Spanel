package config

var (
	// Version is injected at build time via:
	// -ldflags "-X 'spanel/internal/config.Version=v1.2.2'"
	Version   = "v1.2.2"
	GitCommit = "dev"
	BuildDate = ""
)
