# 📄 Product Requirements Document (PRD) — Production-Grade Blueprint
**Project Name:** Zero-Config AI-Powered Self-Hosted PaaS (`spanel`)  
**Platform:** Next.js Web Dashboard & Single-Binary Linux Server (Go Fiber)  
**Distribution:** Single Executable Binary (`//go:embed` Next.js SSG export)  
**Design System:** Glassmorphism, Dark Mode (Neon Accents)  

---

## 1. Product Vision & Architecture Strategy
Platform self-hosted PaaS yang 100% plug-and-play dengan pengalaman setara Vercel + ketangguhan Coolify, diperkuat AI DevOps Agent otonom untuk setup, diagnosis, dan remediate otomatis.

### Core Architectural Pillars
1. **True Single-Binary Distribution:** Backend Go (Fiber) menyajikan REST API, WebSockets, dan seluruh aset statis frontend Next.js (`output: 'export'`) yang di-bundle via `//go:embed`. Tidak membutuhkan Node.js runtime di host server.
2. **Embedded Database & Concurrency:** Menggunakan SQLite dengan driver WAL mode (`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;`). Read (dashboard) dan Write (worker antrean) berjalan paralel bebas lock `SQLITE_BUSY`.
3. **Ephemeral Builder Sandbox:** Nixpacks dieksekusi di dalam temporary container terisolasi (`docker run --rm -v /var/run/docker.sock ... nixpacks/nixpacks`). Skrip instalasi malicious tidak memiliki akses langsung ke host Ubuntu.
4. **Zero-Touch Routing & Healthchecked Zero-Downtime:** Traefik membaca Docker labels secara dinamis. Traffic hanya dialihkan ke container v2 setelah lolos probe healthcheck HTTP 2xx.
5. **Multi-Tenant Network Isolation:** Setiap proyek diisolasi ke dalam Docker user-defined bridge network (`spanel-net-<project_id>`). Akses publik hanya dibuka melalui Traefik reverse proxy.
6. **Master Secret Key:** Enkripsi database (API keys, env vars, DB credentials) menggunakan AES-256-GCM berpatokan pada environment variable `SPANEL_MASTER_KEY`.
7. **VPS Auto-Janitor:** Internal Goroutine cron (`robfig/cron`) aktif setiap pukul 03:00 untuk membersihkan dangling image (`docker image prune -af --filter "until=168h"`) serta rotasi log lama.

---

## 2. Fitur & Modul Utama

### Modul A: AI DevOps Agent (Autonomous Sysadmin)
* **Bring Your Own Key (BYOK):** Penyimpanan API key terenkripsi AES-256-GCM (OpenAI, Anthropic, Gemini).
* **Smart Context Extractor:** Memotong log build secara presisi: 50 baris pertama (inisialisasi/command) + 150 baris terakhir stderr + ringkasan file manifest (`package.json`, `go.mod`, dsb.) + sanitized environment variables (nilai rahasia disensor).
* **Loop Breaker (Anti-Bleeding API):** Maksimal 3 percobaan remediate per deployment. Jika `retries >= 3`, status ditandai `failed_needs_human` untuk mencegah pembengkakan tagihan token API.
* **Supervised vs Autonomous Mode:** Mode `Supervised` (default) meminta konfirmasi klik *"Apply Fix"* sebelum konfigurasi diubah; mode `Autonomous` menerapkan perubahan konfigurasi seketika.
* **Auto-PR & 1-Click Fix:** Membuat Pull Request via GitHub App jika problem ada di level kode, atau otomatis menyesuaikan environment variables/port bila kesalahan ada di level konfigurasi.

### Modul B: Core Deployment & Zero-Downtime Engine
* **GitHub App Integration:** Instalasi OAuth via GitHub App resmi (bukan PAT) untuk manajemen webhook dan clone otomatis.
* **Ephemeral Nixpacks Build:** Deteksi runtime otomatis tanpa perlu Dockerfile manual.
* **Zero-Downtime Traffic Switch:** Container v2 di-spin up dengan label Traefik healthcheck `traefik.http.services.<name>.loadbalancer.healthcheck.path=/`. Setelah respon 2xx terverifikasi, traffic dialihkan dan container v1 dimatikan.
* **Instant Rollback:** Menyimpan `image_hash` pada tabel `DEPLOYMENTS`. Jika versi baru crash, 1-klik rollback langsung mengaktifkan image container sebelumnya dalam hitungan detik.
* **Log Streaming:** WebSocket Fiber menyalurkan output build dan runtime log langsung ke UI Next.js secara real-time.

### Modul C: Resource Guard, Marketplace & Quality of Life (QoL)
* **Cgroups Limiter:** Limitasi RAM & CPU per container untuk mencegah OOM-killer menjatuhkan host server.
* **Persistent Volumes:** Pemetaan folder host ke container untuk data statis/uploads.
* **Marketplace Auto-Wire:** Instalasi 1-klik untuk database (PostgreSQL, MySQL, Redis, MongoDB). Tombol *"Attach Database"* otomatis meng-inject `DATABASE_URL` ke environment variables project target via network internal.
* **Interactive Web Terminal:** WebSocket xterm.js di dashboard yang terhubung ke `docker exec -it <container> /bin/sh`.
* **Magic Staging Domain:** Otomatis memberikan domain staging gratis berbasis IP (misal: `<project-name>.<host-ip>.sslip.io`) sebelum custom domain dikonfigurasi.

---

## 3. 🗄️ Entity-Relationship Diagram (ERD) Final

```mermaid
erDiagram
    USERS {
        uuid id PK
        string username
        string email
        string password_hash
        datetime created_at
    }

    AI_PROVIDERS {
        uuid id PK
        uuid user_id FK
        string provider_name "openai, gemini, anthropic"
        string api_key_encrypted "AES-256-GCM"
        datetime updated_at
    }

    GITHUB_APP_INSTALLATIONS {
        uuid id PK
        uuid user_id FK
        string installation_id
        string account_name
        datetime created_at
    }

    PROJECTS {
        uuid id PK
        uuid user_id FK
        uuid github_installation_id FK
        string name "slug nama proyek"
        string repo_fullname "owner/repo"
        string branch "default: main"
        string custom_domain "nullable"
        string magic_domain "slug.ip.sslip.io"
        int target_port "auto-detected atau custom"
        string healthcheck_path "default: /"
        int memory_limit_mb "default: 512"
        float cpu_limit "default: 1.0"
        string docker_network "spanel-net-<project_id>"
        string ai_mode "supervised, autonomous"
        string status "running, stopped, error"
        datetime created_at
    }

    ENVIRONMENT_VARIABLES {
        uuid id PK
        uuid project_id FK
        string key "e.g. DATABASE_URL"
        string value_encrypted "AES-256-GCM"
        boolean is_system_injected "true jika di-wire otomatis dari marketplace"
    }

    VOLUMES {
        uuid id PK
        uuid project_id FK
        string name
        string container_path
        string host_path
    }

    DEPLOYMENTS {
        uuid id PK
        uuid project_id FK
        string commit_hash
        string commit_message
        string image_hash "Docker image ID untuk instant rollback"
        string status "queued, building, healthy, failed, rolled_back"
        string log_file_path "path local untuk WS streaming & archive"
        int retry_count "counter untuk AI loop breaker (max 3)"
        datetime started_at
        datetime finished_at
    }

    INTERNAL_QUEUE_JOBS {
        uuid id PK
        string job_type "deploy, rollback, ai_analyze, janitor_prune"
        uuid target_id "Deployment ID / Project ID"
        string status "pending, processing, completed, failed"
        text error_trace
        datetime created_at
    }

    AI_REMEDIATIONS {
        uuid id PK
        uuid deployment_id FK
        string error_category "config_issue, code_issue, oom_killed, port_mismatch"
        text ai_analysis
        text suggested_config_json
        string pr_url "GitHub PR URL jika perbaikan di source code"
        boolean is_applied
        datetime created_at
    }

    MARKETPLACE_SERVICES {
        uuid id PK
        uuid user_id FK
        string service_name "postgresql, mysql, redis"
        string container_id
        string internal_hostname "e.g. spanel-pg-<id>"
        int internal_port
        string credentials_encrypted "JSON: user, pass, dbname terenkripsi"
        string volume_host_path
        string status "running, stopped"
        datetime created_at
    }

    USERS ||--o{ AI_PROVIDERS : owns
    USERS ||--o{ GITHUB_APP_INSTALLATIONS : authorizes
    USERS ||--o{ PROJECTS : manages
    USERS ||--o{ MARKETPLACE_SERVICES : deploys
    GITHUB_APP_INSTALLATIONS ||--o{ PROJECTS : links
    PROJECTS ||--o{ ENVIRONMENT_VARIABLES : requires
    PROJECTS ||--o{ VOLUMES : mounts
    PROJECTS ||--o{ DEPLOYMENTS : triggers
    DEPLOYMENTS ||--o| AI_REMEDIATIONS : diagnosed_by
```

---

## 4. Flow Runtime & Lifecyle

```mermaid
sequenceDiagram
    autonumber
    actor User/Git as GitHub Webhook / Dashboard
    participant API as Go Fiber API
    participant Queue as SQLite Queue (WAL)
    participant Worker as Goroutine Worker
    participant Sandbox as Docker Nixpacks Sandbox
    participant Traefik as Traefik Reverse Proxy

    User/Git->>API: Trigger Deploy (Commit / Manual)
    API->>Queue: Push Job (status: pending, retry: 0)
    API-->>User/Git: HTTP 200 Fast ACK (<50ms)
    
    Worker->>Queue: Claim Job (status: processing)
    Worker->>Sandbox: Spin up Ephemeral Nixpacks Container
    Sandbox-->>Worker: Stream logs & Return Docker Image Hash
    
    alt Build Sukses
        Worker->>Traefik: Launch Container v2 (Network: spanel-net, Healthcheck Label)
        Traefik->>Traefik: Probe /healthcheck until HTTP 200
        Traefik->>Traefik: Route traffic to v2
        Worker->>Worker: Stop & Kill Container v1
        Worker->>Queue: Mark Job: completed, Deployment: healthy
    else Build Gagal
        Worker->>Worker: Trigger Smart Log Context Extractor
        Worker->>Worker: Call AI Provider (BYOK)
        alt Retry < 3
            Worker->>Worker: Record AI_REMEDIATIONS (Supervised/Autonomous)
        else Retry >= 3
            Worker->>Queue: Mark Job: failed_needs_human (Loop Breaker Activated)
        end
    end
```