package spanel

import (
	"embed"
	"io/fs"
)

//go:embed all:web/out
var EmbeddedWebFS embed.FS

// GetWebFS returns the sub-filesystem pointing to web/out
func GetWebFS() fs.FS {
	sub, err := fs.Sub(EmbeddedWebFS, "web/out")
	if err != nil {
		return EmbeddedWebFS
	}
	return sub
}
