# sPanel — Self-Hosted PaaS Platform

> Modern, lightweight, and container-native Platform as a Service (PaaS) engine for single-node Linux servers and edge environments.

sPanel is a self-hosted PaaS platform designed as an efficient alternative to traditional cloud hosting platforms. It provides automated source-to-container builds, dynamic reverse proxy routing, environment management, and monitoring within a single lightweight binary built with Go and Next.js.

---

## Key Capabilities

- **Automated Container Builds**: Ephemeral containerized builder powered by Nixpacks and Docker Engine. Supports auto-detection for Node.js, React/Vite, Next.js, Python, Go, and custom Dockerfiles without host toolchain pollution.
- **Dynamic Reverse Proxy & Routing**: Native Traefik integration managing automatic domain routing, port mapping, and SSL certificate termination for magic `.localhost` domains and custom domains.
- **Single Binary Architecture**: High-performance Go Fiber v2 backend embedding the complete static Next.js frontend bundle via `//go:embed`, requiring zero external runtime dependencies.
- **Git & Webhook Integration**: Secure GitHub repository integration supporting public and private repositories, custom branches, and automatic deployment triggers via incoming webhooks.
- **Encrypted Secrets Management**: AES-256-GCM envelope encryption for environment variables, database credentials, and GitHub access tokens with server-side master key derivation.
- **Real-Time Observability**: WebSocket-driven live build and runtime log streaming, container status indicators, and an interactive in-browser shell terminal.
- **AI-Assisted Diagnostics**: Built-in automated error analyzer that inspects build failures, traces root causes, and recommends corrective deployment actions.
- **Database Marketplace**: One-click provisioning for PostgreSQL, MySQL, Redis, and SQLite with automated environment variable injection and backup tooling.

---

## Technical Architecture

| Layer | Technologies |
| :--- | :--- |
| **Backend Core** | Go, Fiber v2, GORM, SQLite (WAL mode) |
| **Frontend UI** | Next.js (App Router), React, Tailwind CSS, Lucide Icons |
| **Orchestration** | Docker Engine API, Traefik Reverse Proxy |
| **Build System** | Nixpacks Ephemeral Container Builder, Native Docker BuildKit |
| **Networking** | WebSockets (Log Streaming & Interactive Shell), RESTful API |
| **Security** | AES-256-GCM Native Go Crypto, CSRF Same-Origin Validation |

---

## Quickstart

### Prerequisites

- Linux or Windows environment with Docker Engine active.
- Go 1.22+ and Node.js 18+ (for building from source).

### 1. Clone Repository

```bash
git clone https://github.com/azka13labib-ops/Spanel.git
cd Spanel
```

### 2. Build Frontend and Binary

```bash
# Build frontend static bundle
cd web
npm install
npm run build
cd ..

# Build Go backend binary
go build -o spanel cmd/server/main.go
```

On Windows systems, the automated build script can be executed:
```powershell
./build.ps1
```

### 3. Run sPanel

```bash
./spanel
```

Access the management dashboard at `http://localhost:8080`. On first launch, follow the initial setup wizard to create the administrative credentials.

---

## Directory Structure

```text
├── cmd/
│   └── server/               # Application entry point and server initialization
├── internal/
│   ├── api/                  # REST endpoints, WebSocket handlers, and authentication middleware
│   ├── builder/              # Nixpacks ephemeral build engine and Docker execution
│   ├── config/               # Configuration loading and environment resolution
│   ├── crypto/               # AES-256-GCM encryption and decryption helpers
│   ├── db/                   # Database models, SQLite initialization, and migrations
│   ├── queue/                # Asynchronous internal deployment job worker queue
│   └── service/              # Core business services (Deployer, Traefik, Janitor)
├── web/                      # Next.js frontend application
│   ├── app/                  # Main application views and routing
│   ├── components/           # UI components, modals, and management views
│   └── lib/                  # API client bindings and WebSocket helpers
├── build.ps1                 # Windows build script
├── Makefile                  # Cross-platform build automation
└── README.md                 # Project documentation
```

---

## License

This project is licensed under the MIT License. Refer to the LICENSE file for details.
