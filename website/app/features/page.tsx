"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  GitBranch,
  Server,
  Database,
  Shield,
  Bot,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type FeatureStatus = "Implemented" | "Partially Implemented" | "Planned";

interface FeatureItem {
  name: string;
  description: string;
  status: FeatureStatus;
  docHref?: string;
  docLabel?: string;
}

interface FeatureCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  features: FeatureItem[];
}

export default function FeaturesPage() {
  const { t, locale } = useLanguage();
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  const categories: FeatureCategory[] = useMemo(() => {
    const isId = locale === "id";
    return [
      {
        title: isId ? "Deployment Aplikasi" : "Application Deployment",
        icon: GitBranch,
        features: [
          {
            name: isId ? "Integrasi Repositori GitHub" : "GitHub Repository Integration",
            description: isId
              ? "Autentikasi via GitHub OAuth untuk memilih repositori, menentukan target deployment branch, dan memicu build otomatis pada git push."
              : "Authenticate via GitHub OAuth to select repositories, choose target deployment branches, and trigger automated builds on git push.",
            status: "Implemented",
            docHref: "/docs/deployment/",
            docLabel: isId ? "Panduan Deploy" : "Deploy Guide",
          },
          {
            name: isId ? "Deteksi Otomatis Sandbox Nixpacks" : "Ephemeral Nixpacks Auto-Detection",
            description: isId
              ? "Menganalisis struktur proyek untuk mengonfigurasi runtime Node.js, Next.js, Python, Laravel, dan Go tanpa perlu membuat file Dockerfile manual."
              : "Analyzes project structure to configure runtimes for Node.js, Next.js, Python, Laravel, and Go without requiring manual Dockerfile configuration.",
            status: "Implemented",
            docHref: "/docs/deployment/",
            docLabel: isId ? "Paket Build" : "Build Packs",
          },
          {
            name: isId ? "Dukungan Kustom Dockerfile" : "Custom Dockerfile Support",
            description: isId
              ? "Mendeteksi file Dockerfile root secara otomatis dan membangun image container multi-stage dengan argumen environment serta konteks build kustom."
              : "Detects root Dockerfile automatically and builds multi-stage container images with custom environment arguments and build contexts.",
            status: "Implemented",
            docHref: "/docs/deployment/",
            docLabel: isId ? "Panduan Dockerfile" : "Dockerfile Guide",
          },
          {
            name: isId ? "Pengalihan Traffic Tanpa Downtime" : "Zero-Downtime Traffic Switch",
            description: isId
              ? "Menjalankan container baru berdampingan dengan versi lama, memverifikasi health check HTTP sebelum Traefik mengalihkan traffic produksi."
              : "Spawns new containers alongside old releases, verifying HTTP health checks before Traefik shifts incoming production traffic.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Perutean Traffic" : "Traffic Routing",
          },
          {
            name: isId ? "Rollback Instan 1-Klik" : "1-Click Instant Rollback",
            description: isId
              ? "Menyimpan hash rilis image container sebelumnya secara lokal, memungkinkan pemulihan cepat ke kondisi stabil saat ada kendala update."
              : "Preserves previous container release hashes locally, enabling fast revert to prior working states if an update fails.",
            status: "Partially Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Dokumen Rollback" : "Rollback Docs",
          },
        ],
      },
      {
        title: isId ? "Pengelolaan Server & Container" : "Container & Server Management",
        icon: Server,
        features: [
          {
            name: isId ? "Siklus Hidup Container Docker" : "Docker Container Lifecycle",
            description: isId
              ? "Start, stop, restart, inspect, dan prune container aplikasi langsung melalui web panel melalui integrasi Docker Engine API."
              : "Start, stop, restart, inspect, and prune application containers directly through the web panel via Docker Engine API integration.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Operasi Container" : "Container Ops",
          },
          {
            name: isId ? "Monitoring Resource Real-Time" : "Live Resource Monitoring",
            description: isId
              ? "Streaming persentase CPU, konsumsi RAM, dan penggunaan disk host per container secara live melalui Server-Sent Events (SSE) yang ringan."
              : "Streams real-time CPU percentage, RAM consumption, and host disk usage per container through low-overhead Server-Sent Events (SSE).",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Stream Metrik" : "Metrics Stream",
          },
          {
            name: isId ? "Terminal Web Interaktif" : "Interactive Web Terminal",
            description: isId
              ? "Membuka shell bash/sh interaktif di dalam container yang berjalan menggunakan xterm.js via WebSockets terotentikasi tanpa kunci SSH."
              : "Opens an interactive bash/sh shell inside running containers using xterm.js over authenticated WebSockets without SSH keys.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Terminal Web" : "Web Terminal",
          },
          {
            name: isId ? "Jaringan Bridge Multi-Tenancy" : "Bridge Network Multi-Tenancy",
            description: isId
              ? "Mengisolasi setiap proyek di dalam Docker bridge network khusus sehingga beban kerja antar proyek tidak dapat mengakses port internal satu sama lain."
              : "Isolates each project within dedicated user-defined Docker bridge networks so sibling workloads cannot access internal ports.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Setup Jaringan" : "Network Setup",
          },
          {
            name: isId ? "Agent Cluster Multi-VPS" : "Multi-VPS Cluster Agent",
            description: isId
              ? "Arsitektur control plane terpusat yang dirancang untuk mengorkestrasi dan melakukan deploy ke banyak VPS Linux jarak jauh dengan node agent ringan."
              : "Centralized control plane architecture designed to orchestrate and deploy across multiple remote Linux VPS hosts with lightweight node agents.",
            status: "Planned",
            docHref: "/roadmap/",
            docLabel: isId ? "Lihat Roadmap" : "View Roadmap",
          },
        ],
      },
      {
        title: isId ? "Provisioning Database" : "Database Provisioning",
        icon: Database,
        features: [
          {
            name: isId ? "Engine PostgreSQL 16" : "PostgreSQL 16 Engine",
            description: isId
              ? "Menyiapkan container PostgreSQL 16 dengan volume penyimpanan persisten, kredensial otomatis, dan perutean port internal."
              : "Provisions PostgreSQL 16 containers with persistent host-mounted storage volumes, generated credentials, and internal port routing.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Dokumen PostgreSQL" : "PostgreSQL Docs",
          },
          {
            name: isId ? "Engine MySQL 8.0" : "MySQL 8.0 Engine",
            description: isId
              ? "Menjalankan instance MySQL 8.0 dengan pembuatan database otomatis, pemantauan status kesehatan, dan persistensi volume khusus."
              : "Deploys MySQL 8.0 instances with automated database creation, health checking, and dedicated volume persistence.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Dokumen MySQL" : "MySQL Docs",
          },
          {
            name: isId ? "Cache In-Memory Redis 7.2" : "Redis 7.2 In-Memory Cache",
            description: isId
              ? "Menjalankan instance in-memory Redis 7.2 yang dioptimalkan untuk background worker queue, pub/sub, dan caching aplikasi."
              : "Runs in-memory Redis 7.2 instances optimized for background worker queues, pub/sub, and application caching layers.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Dokumen Redis" : "Redis Docs",
          },
          {
            name: isId ? "Auto-Attach & Injeksi Variabel Lingkungan" : "Auto-Attach & Env Injection",
            description: isId
              ? "Menghasilkan dan menginjeksikan DATABASE_URL, DB_HOST, DB_PORT, serta kredensial ke dalam container aplikasi saat disimpan."
              : "Generates and injects DATABASE_URL, DB_HOST, DB_PORT, and user credentials into attached application containers on save.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Injeksi Env" : "Env Injection",
          },
          {
            name: isId ? "Snapshot Backup S3 Otomatis" : "Automated S3 Backup Snapshots",
            description: isId
              ? "Jadwal dump database dan snapshot volume penyimpanan yang diekspor ke Amazon S3, MinIO, atau Cloudflare R2 object storage."
              : "Scheduled database dumps and storage volume snapshots exported to Amazon S3, MinIO, or Cloudflare R2 object storage.",
            status: "Partially Implemented",
            docHref: "/roadmap/",
            docLabel: isId ? "Lihat Roadmap" : "View Roadmap",
          },
        ],
      },
      {
        title: isId ? "Domain, Routing & Keamanan" : "Domains, Routing & Security",
        icon: Shield,
        features: [
          {
            name: isId ? "Domain Staging Instan" : "Magic Staging Domains",
            description: isId
              ? "Memberikan URL preview instan via sslip.io berdasarkan IP host agar hasil deployment dapat langsung diakses sebelum propagasi DNS."
              : "Assigns instant preview URLs using sslip.io based on host IP addresses so deployments are accessible prior to DNS propagation.",
            status: "Implemented",
            docHref: "/docs/deployment/",
            docLabel: isId ? "URL Staging" : "Staging URLs",
          },
          {
            name: isId ? "Otomatisasi SSL Let's Encrypt" : "Let's Encrypt SSL Automation",
            description: isId
              ? "Menerbitkan dan memperbarui sertifikat TLS gratis Let's Encrypt secara otomatis melalui integrasi Traefik ACME untuk domain kustom."
              : "Issues and renews free Let's Encrypt TLS certificates automatically through Traefik ACME integration for custom domains.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Otomasi SSL" : "SSL Automation",
          },
          {
            name: isId ? "Enkripsi Rahasia AES-256-GCM" : "AES-256-GCM Secret Encryption",
            description: isId
              ? "Mengenkripsi variabel lingkungan sensitif, rahasia, dan token API di SQLite menggunakan algoritma terotentikasi AES-256-GCM."
              : "Encrypts sensitive environment variables, secrets, and provider API tokens at rest in SQLite using authenticated AES-256-GCM.",
            status: "Implemented",
            docHref: "/installation/",
            docLabel: isId ? "Setup Keamanan" : "Security Setup",
          },
          {
            name: isId ? "Reset Kredensial Aman via CLI" : "Secure CLI Credential Reset",
            description: isId
              ? "Mereset password admin melalui prompt stdin terminal tersembunyi (spanel reset-password) tanpa memperlihatkan teks di bash history atau daftar proses."
              : "Resets admin passwords via interactive hidden terminal stdin prompts (spanel reset-password) without exposing credentials in bash history or process lists.",
            status: "Implemented",
            docHref: "/installation/",
            docLabel: isId ? "Panduan CLI Reset" : "CLI Reset Guide",
          },
          {
            name: isId ? "Jaringan Privat & Mode Tailscale" : "Private Network & Tailscale Mode",
            description: isId
              ? "Mengizinkan traffic dashboard dan aplikasi tanpa enkripsi HTTPS paksa di dalam jaringan pribadi Tailscale 100.x.x.x dan subnet lokal."
              : "Permits unencrypted dashboard and application traffic across private 100.x.x.x Tailscale networks and local subnets without forcing HTTPS redirects.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Dokumen Tailscale" : "Tailscale Docs",
          },
        ],
      },
      {
        title: isId ? "Asisten AI DevOps" : "AI DevOps Assistant",
        icon: Bot,
        features: [
          {
            name: isId ? "Gunakan API Key Sendiri (BYOK)" : "Bring Your Own Key (BYOK)",
            description: isId
              ? "Gunakan kunci API Google Gemini atau OpenAI milik Anda sendiri yang disimpan terenkripsi AES-256-GCM, tanpa biaya tambahan platform pihak ketiga."
              : "Connects user-provided Google Gemini or OpenAI API keys stored with AES-256-GCM encryption, eliminating external platform fees.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Setup Kunci AI" : "AI Key Setup",
          },
          {
            name: isId ? "Ekstraktor Konteks Cerdas" : "Smart Context Extractor",
            description: isId
              ? "Menganalisis log crash container, stream stderr, dan konfigurasi build untuk mengekstrak konteks diagnostik yang tepat sasaran."
              : "Parses container crash logs, stderr streams, and build configs to extract relevant diagnostic context for targeted troubleshooting.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Analisis Error" : "Error Analysis",
          },
          {
            name: isId ? "Pembatas Loop Anti-Bleeding" : "Anti-Bleeding Loop Breaker",
            description: isId
              ? "Membatasi loop pemecahan masalah otomatis maksimal 3 iterasi per insiden kegagalan untuk mencegah pembengkakan konsumsi token LLM."
              : "Caps automated troubleshooting loops at 3 iterations per failure event to prevent runaway LLM token consumption.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Pengaman Token" : "Safety Guard",
          },
          {
            name: isId ? "Asisten AI Dokumentasi Interaktif" : "Interactive Docs AI Assistant",
            description: isId
              ? "Menyediakan asisten dokumentasi interaktif di browser untuk menjawab pertanyaan seputar deployment, container, dan infrastruktur."
              : "Provides an in-browser documentation assistant to answer deployment, container configuration, and infrastructure questions.",
            status: "Implemented",
            docHref: "/docs/",
            docLabel: isId ? "Coba Chat Dokumen" : "Try Docs Chat",
          },
        ],
      },
    ];
  }, [locale]);

  // Derived counts
  const allFeatures = useMemo(
    () => categories.flatMap((c) => c.features),
    [categories]
  );
  const totalCount = allFeatures.length;
  const implementedCount = allFeatures.filter((f) => f.status === "Implemented").length;
  const partiallyCount = allFeatures.filter(
    (f) => f.status === "Partially Implemented"
  ).length;
  const plannedCount = allFeatures.filter((f) => f.status === "Planned").length;

  const filterOptions = [
    { label: t("features.filter_all"), value: "All", count: totalCount },
    {
      label: t("features.status_implemented"),
      value: "Implemented",
      count: implementedCount,
      dotColor: "bg-emerald-500",
    },
    {
      label: t("features.status_partially"),
      value: "Partially Implemented",
      count: partiallyCount,
      dotColor: "bg-amber-500",
    },
    {
      label: t("features.status_planned"),
      value: "Planned",
      count: plannedCount,
      dotColor: "bg-slate-400",
    },
  ];

  const filteredCategories = useMemo(() => {
    if (selectedStatus === "All") return categories;
    return categories
      .map((cat) => ({
        ...cat,
        features: cat.features.filter((f) => f.status === selectedStatus),
      }))
      .filter((cat) => cat.features.length > 0);
  }, [categories, selectedStatus]);

  return (
    <div className="min-h-screen py-12 md:py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
            <Layers className="w-3.5 h-3.5" />
            <span>{t("features.badge")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-slate-900 tracking-tight">
            {t("features.title")}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            {t("features.subtitle")}
          </p>
        </div>

        {/* Status Filter & Control Strip */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-2 sm:p-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 py-1 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>{t("common.filter")}</span>
              </span>
              {filterOptions.map((opt) => {
                const isSelected = selectedStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedStatus(opt.value)}
                    className={`min-h-10 px-3.5 py-2 sm:min-h-0 sm:py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
                      isSelected
                        ? "bg-indigo-600 text-white font-semibold shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {opt.dotColor && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected ? "bg-white" : opt.dotColor
                        }`}
                      />
                    )}
                    <span>{opt.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected
                          ? "bg-indigo-700 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descriptive Status Legend */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-100/70 border border-slate-200/80 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">
                  {t("features.legend_implemented_title")} ({implementedCount})
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-normal">
                  {t("features.legend_implemented_desc")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">
                  {t("features.legend_partially_title")} ({partiallyCount})
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-normal">
                  {t("features.legend_partially_desc")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">
                  {t("features.legend_planned_title")} ({plannedCount})
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-normal">
                  {t("features.legend_planned_desc")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Categories Matrix */}
        <div className="space-y-8 sm:space-y-10">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            const visibleCount = cat.features.length;

            return (
              <section
                key={cat.title}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
              >
                {/* Category Header */}
                <div className="px-5 py-4 sm:px-6 sm:py-4.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      {cat.title}
                    </h2>
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    <span>
                      {visibleCount} {visibleCount === 1 ? t("common.capability") : t("common.capabilities")}
                    </span>
                  </div>
                </div>

                {/* Feature Rows */}
                <div className="divide-y divide-slate-100">
                  {cat.features.map((feat) => (
                    <div
                      key={feat.name}
                      className="p-5 sm:px-6 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Left: Title & Practical Description */}
                      <div className="flex-1 min-w-0 pr-0 md:pr-6 space-y-1">
                        <h3 className="text-[15px] sm:text-base font-semibold text-slate-900 tracking-tight">
                          {feat.name}
                        </h3>
                        <p className="text-sm text-slate-600 leading-normal sm:leading-relaxed">
                          {feat.description}
                        </p>
                      </div>

                      {/* Right: Docs Link & Status Badge */}
                      <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {feat.docHref && (
                          <Link
                            href={feat.docHref}
                            className="inline-flex items-center gap-1 text-[13px] font-medium text-indigo-600 hover:text-indigo-800 transition focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1.5 py-0.5 -ml-1.5"
                          >
                            <span>{feat.docLabel || (locale === "id" ? "Dokumen" : "Docs")}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        )}

                        <div className="shrink-0">
                          {feat.status === "Implemented" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{t("features.status_implemented")}</span>
                            </span>
                          )}
                          {feat.status === "Partially Implemented" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>{t("features.status_partially")}</span>
                            </span>
                          )}
                          {feat.status === "Planned" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>{t("features.status_planned")}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* CTA Card */}
        <div className="p-8 sm:p-10 rounded-2xl bg-indigo-950 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm border border-indigo-900/60">
          <div className="space-y-1.5 text-center md:text-left max-w-xl">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              {t("features.cta_title")}
            </h3>
            <p className="text-sm text-indigo-200 leading-relaxed">
              {t("features.cta_subtitle")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 shrink-0 w-full sm:w-auto">
            <Link
              href="/installation/"
              className="min-h-11 flex items-center justify-center px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-indigo-950 bg-white hover:bg-indigo-50 transition shadow-xs focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
            >
              {t("common.install_btn")}
            </Link>
            <Link
              href="/docs/"
              className="min-h-11 flex items-center justify-center px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-white border border-indigo-700/80 hover:bg-indigo-900/60 transition focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none cursor-pointer"
            >
              {t("common.read_docs")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

