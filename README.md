# sPanel (Smart PaaS Panel) 🚀

> **Self-Hosted PaaS Ringan, Modern & Berbasis AI untuk Deployment Aplikasi Anda.**

sPanel adalah platform self-hosted PaaS (Platform as a Service) alternatif modern untuk Vercel / Railway / Coolify yang dirancang sangat ringan, mudah digunakan, dan siap produksi di VPS Linux Anda. Dibangun menggunakan **Go (Single Binary)** dan antarmuka web modern dengan **Next.js & Tailwind CSS**.

---

## ✨ Fitur Utama

- 🐳 **Docker-Native Execution**: Manajemen lifecycle container otomatis (build, start, stop, restart, delete) dengan Docker SDK.
- ⚡ **Single Binary Deployment**: Backend Go meng-embed langsung static frontend Next.js (`//go:embed`). Tanpa dependensi runtime tambahan.
- 🐙 **GitHub Integration**: Hubungkan akun GitHub dengan aman menggunakan Personal Access Token (PAT). Mendukung repository publik maupun privat serta pemilihan branch secara dinamis.
- 🔍 **Zero-Config Buildpacks**: Deteksi otomatis arsitektur aplikasi (Node.js/Next.js, Python/FastAPI, Go, Static HTML/React, Dockerfile kustom).
- 📊 **Real-time Metrics & Logs**: Monitoring penggunaan CPU, RAM, Network I/O, serta live build/container logs via Server-Sent Events (SSE).
- 🔒 **Keamanan Terenkripsi**: Penyimpanan secret dan token sensitif dienkripsi menggunakan AES-256-GCM dengan master key lokal.
- 🤖 **AI-Assisted Engine**: Diagnostik error deployment dan optimasi konfigurasi container otomatis berbasis AI.
- 🎨 **Modern Sleek UI**: Antarmuka responsif bernuansa dark mode modern dengan UX intuitif.

---

## 🛠️ Tech Stack

- **Backend**: [Go](https://go.dev/) (Gin Web Framework, Docker Go SDK, GORM / SQLite)
- **Frontend**: [Next.js](https://nextjs.org/) (App Router, Tailwind CSS, Lucide Icons)
- **Containerization**: [Docker Engine](https://www.docker.com/)
- **Encryption**: Native Go Crypto (AES-256-GCM)

---

## 🚀 Memulai (Quickstart)

### Prasyarat
- [Docker](https://docs.docker.com/engine/install/) terpasang dan service daemon aktif.
- [Go 1.22+](https://go.dev/dl/) & [Node.js 18+](https://nodejs.org/) (jika ingin build dari source).

### 1. Clone Repository
```bash
git clone https://github.com/azka13labib-ops/Spanel.git
cd Spanel
```

### 2. Build Frontend & Binary
```bash
# Build Frontend
cd web
npm install
npm run build
cd ..

# Build Backend Go Binary
go build -o spanel cmd/server/main.go
```
*(Atau di Windows PowerShell, jalankan `./build.ps1`)*

### 3. Jalankan sPanel
```bash
./spanel
```
Buka browser di `http://localhost:8080`.

---

## 📁 Struktur Direktori

```text
├── cmd/
│   └── server/
│       └── main.go           # Entry point aplikasi
├── internal/
│   ├── api/                  # REST API routes & HTTP handlers
│   ├── buildpack/            # Auto-detection & Dockerfile generator
│   ├── config/               # Manajemen konfigurasi & env
│   ├── docker/               # Wrapper Docker API & resource streaming
│   ├── models/               # Skema database SQLite
│   └── security/             # AES-256-GCM encryption & key management
├── web/                      # Frontend Next.js
│   ├── app/                  # App Router & UI components
│   └── out/                  # Hasil static export (embedded ke binary)
├── build.ps1                 # Script build otomatis Windows
├── Makefile                  # Build tasks untuk Linux/macOS
└── README.md
```

---

## 📄 Lisensi
Didistribusikan di bawah lisensi MIT. Silakan gunakan dan kembangkan sesuai kebutuhan Anda.
