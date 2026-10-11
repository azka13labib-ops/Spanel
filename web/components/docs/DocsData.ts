export interface DocSection {
  id: string;
  title: string;
  badge?: string;
  category: string;
  summary: string;
  content: string;
  tags: string[];
}

export interface DocCategory {
  id: string;
  name: string;
  iconName: string;
  sections: DocSection[];
}

export const DOCS_CATEGORIES: DocCategory[] = [
  {
    id: "getting-started",
    name: "Memulai (Getting Started)",
    iconName: "Rocket",
    sections: [
      {
        id: "overview",
        title: "Pengenalan sPanel",
        category: "getting-started",
        badge: "v1.1.0",
        summary: "Platform as a Service (PaaS) mandiri (self-hosted) bertenaga AI dengan arsitektur single-binary Go Fiber & Next.js.",
        tags: ["intro", "arsitektur", "overview", "paas"],
        content: `
### Apa itu sPanel?

**sPanel** adalah platform self-hosted PaaS modern yang dirancang untuk menjalankan dan mengelola aplikasi web serta database di infrastruktur Linux VPS dengan pengalaman semulus Vercel dan ketangguhan sekelas Coolify.

#### 🏛️ Pilar Arsitektur Utama
- **True Single-Binary Distribution:** Backend Go (Fiber) menyajikan REST API, WebSockets, dan seluruh aset frontend Next.js yang di-embed langsung ke dalam satu binary Linux. Tidak membutuhkan runtime Node.js di host server.
- **Embedded Database & Concurrency:** Menggunakan SQLite dengan driver WAL mode (\`journal_mode=WAL; busy_timeout=5000;\`) sehingga read (dashboard) dan write (antrean build) berjalan paralel bebas lock \`SQLITE_BUSY\`.
- **Ephemeral Sandbox Builder:** Nixpacks dieksekusi di dalam container terisolasi (\`nixpacks/nixpacks\`) tanpa risiko skrip instalasi merusak host server.
- **Zero-Touch Routing & Health Checks:** Traefik membaca Docker labels secara dinamis. Traffic hanya dialihkan ke container baru setelah lolos probe HTTP 2xx.
- **Enkripsi AES-256-GCM:** Variabel rahasia, token API, dan kredensial database dienkripsi di tingkat database menggunakan master secret key.
        `,
      },
      {
        id: "installation",
        title: "Instalasi & Menjalankan di VPS",
        category: "getting-started",
        summary: "Panduan menjalankan sPanel pada server Ubuntu/Debian dan konfigurasi systemd service.",
        tags: ["install", "vps", "systemd", "setup"],
        content: `
### Langkah Instalasi di Linux VPS

sPanel berjalan langsung sebagai file binary tunggal di Linux (amd64 / arm64).

#### 1. Persyaratan Sistem
- Linux OS: Ubuntu 22.04+ / Debian 12+
- Docker Engine & Docker Compose terpasang
- Port terbuka: \`8090\` (Dashboard sPanel), \`80\` & \`443\` (Traefik Reverse Proxy)

#### 2. Menjalankan Binary
\`\`\`bash
chmod +x spanel
./spanel
\`\`\`
sPanel akan otomatis membuat folder \`./data\`, menginisialisasi SQLite database, dan membuat master key enkripsi.

#### 3. Membuat Systemd Service (Otomatis Aktif Saat Boot)
Buat file service di \`/etc/systemd/system/spanel.service\`:
\`\`\`ini
[Unit]
Description=sPanel Zero-Config AI-Powered Self-Hosted PaaS
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/home/ubuntu/spanel
Environment="PORT=8090"
Environment="HOST_IP=100.125.7.123"
Environment="DATA_DIR=/home/ubuntu/spanel/data"
Environment="SPANEL_ALLOW_INSECURE_HTTP=true"
ExecStart=/home/ubuntu/spanel/spanel
Restart=always
RestartSec=3s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
\`\`\`

Aktifkan service:
\`\`\`bash
sudo systemctl daemon-reload
sudo systemctl enable --now spanel
sudo systemctl status spanel
\`\`\`
        `,
      },
      {
        id: "cli-reset-password",
        title: "Reset Password Admin via CLI",
        category: "getting-started",
        badge: "Security",
        summary: "Cara aman dan instan mereset kredensial administrator melalui host terminal tanpa downtime.",
        tags: ["password", "reset", "cli", "auth"],
        content: `
### Reset Password Admin Melalui Host CLI

Jika Anda lupa password admin dashboard, sPanel menyediakan perintah CLI bawaan yang aman:

#### Opsi A: Menggunakan Stdin Pipe (Direkomendasikan untuk Scripting)
\`\`\`bash
echo 'PasswordBaruAnda123' | /home/ubuntu/spanel/spanel reset-password
\`\`\`

#### Opsi B: Menggunakan Prompt Interaktif Tersembunyi
\`\`\`bash
/home/ubuntu/spanel/spanel reset-password
# Input password tidak akan ditampilkan di layar untuk mencegah shoulder-surfing
\`\`\`

> **Catatan Keamanan Penting:**
> - Password dilarang diberikan via argumen baris perintah (\`spanel reset-password <pass>\`) karena password akan terekam di \`history\` shell dan perintah \`ps aux\`.
> - Setiap reset password berhasil, sPanel otomatis mencabut (*revoke*) seluruh sesi login aktif di SQLite database dan memperbarui hash bcrypt di \`data/admin.key\`.
        `,
      },
    ],
  },
  {
    id: "deployments",
    name: "Deployments & Aplikasi",
    iconName: "Layers",
    sections: [
      {
        id: "git-deployment",
        title: "Deploy Repositori GitHub",
        category: "deployments",
        summary: "Menghubungkan repositori GitHub, auto-detection Nixpacks, dan pemicu webhook.",
        tags: ["deploy", "github", "git", "webhook"],
        content: `
### Alur Deployment Repositori

sPanel mengintegrasikan alur deployment modern langsung dari GitHub:

1. **GitHub App Connection:** Hubungkan akun GitHub Anda di tab **GitHub**.
2. **Buat Proyek Baru:** Pilih repositori dan branch target (misal \`main\`).
3. **Deteksi Runtime Otomatis:** sPanel menggunakan ephemeral Nixpacks builder untuk mendeteksi runtime tanpa perlu Dockerfile:
   - Node.js / Next.js / Vue / Nuxt
   - Python / Django / FastAPI
   - Go / Fiber / Gin
   - PHP / Laravel
   - Rust / Ruby / Java
4. **Custom Dockerfile:** Jika repositori Anda memiliki \`Dockerfile\`, sPanel akan memprioritaskan build Dockerfile tersebut.
5. **Auto-Deploy on Push:** Webhook otomatis diatur agar setiap commit push ke branch target memicu deployment baru tanpa downtime.
        `,
      },
      {
        id: "zero-downtime",
        title: "Zero-Downtime & Instant Rollback",
        category: "deployments",
        badge: "Traefik",
        summary: "Mekanisme pengalihan trafik berbasis health check dan pemulihan instan versi sebelumnya.",
        tags: ["zero-downtime", "rollback", "traefik", "healthcheck"],
        content: `
### Cara Kerja Zero-Downtime Traffic Switch

1. Saat deployment baru dimulai, Traefik tetap mengalirkan traffic pengguna ke container v1 (versi stabil berjalan).
2. Container v2 di-spin up dengan konfigurasi dan build terbaru di network terisolasi.
3. Traefik mengirim probe health check HTTP ke port target container v2 (\`healthcheck.path=/\`).
4. Setelah respon 2xx terverifikasi stabil, Traefik seketika mengalihkan rute traffic ke container v2.
5. Container v1 dinonaktifkan secara anggun (*graceful shutdown*).

#### ⚡ Instant Rollback 1-Klik
Setiap deployment sukses menyimpan \`image_hash\` ke dalam riwayat deployment. Jika rilis terbaru mengalami kendala fungsional:
- Buka tab **Deployments**.
- Klik tombol **Rollback** pada versi stabil sebelumnya.
- Container lama aktif kembali dalam hitungan detik tanpa proses compile ulang!
        `,
      },
      {
        id: "domains-ssl",
        title: "Domain Staging & Custom SSL",
        category: "deployments",
        summary: "Domain otomatis sslip.io dan konfigurasi domain kustom dengan sertifikat Let's Encrypt TLS.",
        tags: ["domain", "ssl", "https", "sslip"],
        content: `
### Konfigurasi Domain & Sertifikat SSL

#### 1. Magic Staging Domain (\`sslip.io\`)
Setiap aplikasi otomatis mendapatkan URL staging gratis berbasis IP VPS:
\`\`\`
http://<project-name>.<host-ip>.sslip.io
\`\`\`
Anda dapat langsung menguji aplikasi sebelum mengatur DNS publik.

#### 2. Custom Domain
Untuk menggunakan domain Anda sendiri (misal: \`app.domainanda.com\`):
1. Arahkan DNS **A Record** \`app.domainanda.com\` ke IP VPS sPanel Anda.
2. Di halaman detail aplikasi sPanel, masukkan domain kustom pada kolom **Custom Domain**.
3. Traefik akan otomatis menerbitkan sertifikat SSL Let's Encrypt gratis dan memperbarui sertifikat saat mendekati masa kedaluwarsa.
        `,
      },
    ],
  },
  {
    id: "env-vars",
    name: "Environment Variables",
    iconName: "KeyRound",
    sections: [
      {
        id: "build-vs-runtime",
        title: "Build-Time vs Runtime Variables",
        category: "env-vars",
        badge: "Next.js",
        summary: "Perbedaan kritis antara variabel build-time (client-side) dan runtime (server-side).",
        tags: ["env", "nextjs", "build-time", "runtime"],
        content: `
### Memahami Scope Environment Variables

sPanel membedakan secara tegas scope variabel lingkungan untuk mencegah kebocoran data rahasia dan memastikan framework seperti Next.js bekerja sempurna:

| Aspek | Build-Time Variables | Runtime Variables |
| :--- | :--- | :--- |
| **Kapan Di-inject** | Saat \`nixpacks build\` / \`npm run build\` | Saat container dijalankan (\`docker run\`) |
| **Contoh Penggunaan** | \`NEXT_PUBLIC_API_URL\`, \`VITE_APP_TITLE\` | \`DATABASE_URL\`, \`JWT_SECRET\`, \`API_KEY\` |
| **Visibilitas** | Ter-bundle ke dalam JS statis browser | Hanya tersimpan di memory container server |
| **Penerapan Nilai Baru** | **Harus Rebuild** aplikasi | Cukup **Restart Container** |

#### ⚠️ Peringatan untuk Pengembang Next.js
Variabel dengan awalan \`NEXT_PUBLIC_\` dievaluasi dan di-hardcode ke dalam file static JS saat compile time. Jika Anda mengubah nilainya, pastikan menekan tombol **Rebuild** di sPanel agar bundle statis dibuat ulang dengan nilai terbaru!
        `,
      },
      {
        id: "secrets-encryption",
        title: "Masking & Enkripsi AES-256-GCM",
        category: "env-vars",
        summary: "Perlindungan data rahasia dengan enkripsi simetris militer di database sPanel.",
        tags: ["security", "encryption", "aes", "secrets"],
        content: `
### Enkripsi Data Sensitif

Semua variabel bertanda **Sensitive / Secret** di sPanel dilindungi dengan mekanisme:
1. **Masked UI:** Nilai variabel disensor di antarmuka web (\`••••••••\`) untuk mencegah kebocoran saat presentasi atau screen sharing.
2. **AES-256-GCM Encryption:** Nilai dienkripsi menggunakan algoritma AES-256-GCM berpatokan pada \`SPANEL_MASTER_KEY\` sebelum disimpan ke SQLite.
3. **Decryption at Injection:** Nilai rahasia hanya didekripsi saat disuntikkan ke proses build terisolasi atau container runtime.
        `,
      },
    ],
  },
  {
    id: "databases",
    name: "Manajemen Database",
    iconName: "Database",
    sections: [
      {
        id: "database-provisioning",
        title: "Penyediaan Database 1-Klik",
        category: "databases",
        summary: "Menjalankan PostgreSQL, MySQL, Redis, dan SQLite terisolasi dengan persistent volume.",
        tags: ["database", "postgres", "mysql", "redis", "sqlite"],
        content: `
### Database yang Didukung

sPanel menyediakan database siap pakai dalam satu klik melalui menu **Marketplace**:

- **PostgreSQL 16:** Port internal \`5432\`, relational DB dengan performa tinggi.
- **MySQL 8.0:** Port internal \`3306\`, kompatibilitas penuh untuk Laravel, WordPress, dan Node.js.
- **Redis 7.2:** Port internal \`6379\`, in-memory key-value cache dan queue backend.
- **SQLite:** Embedded file-based storage langsung di volume aplikasi.

#### 📁 Persistent Volumes
Data database disimpan pada folder host terisolasi (\`./data/services/<id>/data\`). Mematikan atau memperbarui container database tidak akan menghapus data Anda.
        `,
      },
      {
        id: "auto-attach",
        title: "Fitur Auto-Attach ke Aplikasi",
        category: "databases",
        badge: "Auto-Wire",
        summary: "Menghubungkan container aplikasi ke database privat dan otomatis menyuntikkan environment variables.",
        tags: ["attach", "network", "env-injection", "laravel"],
        content: `
### Cara Menggunakan Auto-Attach

1. Buat database baru (misal PostgreSQL atau MySQL).
2. Di halaman detail database atau aplikasi Anda, pilih **Attach Database**.
3. sPanel akan otomatis:
   - Menautkan container aplikasi dan container database ke dalam **Docker Bridge Network privat** yang sama (\`spanel-net\`).
   - Menyuntikkan seluruh environment variable yang dibutuhkan framework (seperti Laravel, Prisma, TypeORM, Spring):
\`\`\`env
DATABASE_URL=postgresql://sadmin_db:secret@spanel-db-my-postgres:5432/my_database
DB_CONNECTION=pgsql
DB_HOST=spanel-db-my-postgres
DB_PORT=5432
DB_DATABASE=my_database
DB_USERNAME=sadmin_db
DB_PASSWORD=secret
\`\`\`
   - Restart container aplikasi agar koneksi database langsung aktif seketika!
        `,
      },
    ],
  },
  {
    id: "ai-agent",
    name: "AI DevOps Assistant",
    iconName: "Bot",
    sections: [
      {
        id: "ai-byok-setup",
        title: "Setup API Key (BYOK Gemini & OpenAI)",
        category: "ai-agent",
        summary: "Menghubungkan API key Google Gemini atau OpenAI untuk asisten troubleshooting otomatis.",
        tags: ["ai", "gemini", "openai", "byok"],
        content: `
### Konfigurasi AI Provider (Bring Your Own Key)

sPanel tidak memungut biaya token tambahan. Anda dapat menggunakan kunci API Anda sendiri:

1. Buka menu **Settings** > **AI Provider**.
2. Pilih provider:
   - **Google Gemini** (Gemini 1.5 Flash - Gratis / Sangat Hemat)
   - **OpenAI** (GPT-4o Mini)
3. Masukkan API Key Anda.
4. Klik **Test Connection** untuk memverifikasi keabsahan kunci.
5. Kunci Anda akan disimpan terenkripsi secara aman dengan AES-256-GCM.
        `,
      },
      {
        id: "autonomous-diagnosis",
        title: "Diagnosis Error & 1-Click Fix",
        category: "ai-agent",
        badge: "Autonomous",
        summary: "Analisis log error build otomatis dan rekomendasi perbaikan konfigurasi.",
        tags: ["diagnosis", "logs", "auto-fix", "remediation"],
        content: `
### Cara Kerja AI DevOps Agent Saat Deployment Gagal

1. **Smart Context Extractor:** Saat build gagal, sPanel secara cerdas mengekstrak 50 baris inisialisasi awal + 150 baris terakhir pesan error + file konfigurasi proyek (tanpa membocorkan isi environment secret).
2. **Diagnosis Presisi:** AI menganalisis signature error (apakah port mismatch, dependensi hilang, sintaks rusak, atau memori OOM).
3. **Rekomendasi Solusi:** AI menyajikan penjelasan masalah dalam Bahasa Indonesia dan tombol **1-Click Apply Fix** untuk menyesuaikan konfigurasi container atau memicu rebuild.
4. **Loop Breaker:** AI dibatasi maksimal 3 kali percobaan perbaikan otomatis per deployment untuk mencegah pembengkakan tagihan token API.
        `,
      },
    ],
  },
  {
    id: "server-ops",
    name: "Operasional Server & Keamanan",
    iconName: "ShieldAlert",
    sections: [
      {
        id: "tailscale-private-network",
        title: "Akses IP Privat / Tailscale",
        category: "server-ops",
        summary: "Panduan mengaktifkan akses HTTP tidak terenkripsi pada jaringan VPN privat / Tailscale.",
        tags: ["tailscale", "vpn", "https-required", "transport"],
        content: `
### Mengakses sPanel Melalui Tailscale / IP Privat

Secara default, sPanel menerapkan kebijakan keamanan ketat yang mewajibkan HTTPS di lingkungan produksi.

Jika Anda mengakses server melalui IP Tailscale (\`100.x.x.x\`) atau LAN privat tanpa sertifikat TLS:

Tambahkan environment variable pada service sPanel di \`/etc/systemd/system/spanel.service\`:
\`\`\`ini
Environment="SPANEL_ALLOW_INSECURE_HTTP=true"
\`\`\`

Lalu terapkan perubahan:
\`\`\`bash
sudo systemctl daemon-reload
sudo systemctl restart spanel
\`\`\`

Opsi ini mengizinkan koneksi HTTP di jaringan privat Anda dan mengatur cookie autentikasi agar tetap tersimpan di browser tanpa memerlukan SSL.
        `,
      },
      {
        id: "docker-maintenance",
        title: "Pemeliharaan Docker & Pembersihan Cache",
        category: "server-ops",
        summary: "Perintah membersihkan container rusak, build cache, dan pemantauan resource VPS.",
        tags: ["docker", "prune", "maintenance", "cache"],
        content: `
### Pemeliharaan Berkala Docker VPS

Jika Anda mengalami kendala build atau disk space penuh:

#### 1. Membersihkan Container yang Berhenti
\`\`\`bash
docker container prune -f
\`\`\`

#### 2. Membersihkan Dangling Images & Build Cache
\`\`\`bash
docker image prune -f
docker builder prune -f
\`\`\`

#### 3. Memeriksa Log sPanel
\`\`\`bash
journalctl -u spanel -n 100 --no-pager
\`\`\`
        `,
      },
    ],
  },
  {
    id: "api-reference",
    name: "Referensi API",
    iconName: "Code",
    sections: [
      {
        id: "rest-endpoints",
        title: "Daftar REST API Endpoints",
        category: "api-reference",
        summary: "Ringkasan endpoint API inti sPanel untuk integrasi kustom dan otomatisasi.",
        tags: ["api", "rest", "endpoints", "json"],
        content: `
### Endpoint API Inti sPanel

| Metode | Endpoint | Keterangan |
| :--- | :--- | :--- |
| \`GET\` | \`/api/health\` | Liveness probe status server (Publik) |
| \`POST\` | \`/api/auth/login\` | Autentikasi sesi admin (\`spanel_session\` cookie) |
| \`GET\` | \`/api/projects\` | Daftar seluruh proyek aplikasi |
| \`POST\` | \`/api/projects\` | Membuat proyek baru |
| \`POST\` | \`/api/projects/:id/deploy\` | Memicu deployment aplikasi |
| \`POST\` | \`/api/projects/:id/rollback\` | Rollback ke rilis sebelumnya |
| \`GET\` | \`/api/containers\` | Daftar seluruh container Docker di VPS |
| \`GET\` | \`/api/system/metrics\` | Penggunaan CPU, RAM, Goroutines, Disk |
| \`POST\` | \`/api/docs/chat\` | Tanya Jawab Asisten Dokumentasi AI (Publik) |
        `,
      },
    ],
  },
];
