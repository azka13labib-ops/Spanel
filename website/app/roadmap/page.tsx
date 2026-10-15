"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  Server,
  Database,
  Shield,
  Box,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function RoadmapPage() {
  const { t, locale } = useLanguage();
  const isId = locale === "id";

  const sections = useMemo(
    () => [
      {
        stage: isId ? "Telah Rilis & Tersedia (v1.1.0)" : "Shipped & Available (v1.1.0)",
        description: isId
          ? "Fitur inti PaaS terverifikasi dan beroperasi penuh di rilis produksi saat ini."
          : "Core PaaS features verified and operational in current production releases.",
        badge: isId ? "Selesai" : "Completed",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        items: [
          {
            title: isId ? "Arsitektur Single-Binary" : "Single-Binary Architecture",
            desc: isId
              ? "Backend Go Fiber menyematkan aset statis Next.js tanpa memerlukan Node.js di server host."
              : "Go Fiber backend embedding Next.js static assets with zero Node.js host requirement.",
          },
          {
            title: isId ? "Sandbox Build Nixpacks" : "Ephemeral Nixpacks Builder",
            desc: isId
              ? "Pipeline build container terisolasi yang mendukung Node.js, Python, Laravel, Go, dan web statis."
              : "Sandbox container build pipeline supporting Node.js, Python, Laravel, Go, and static sites.",
          },
          {
            title: isId ? "Provisioning Database & Auto-Attach" : "Database Provisioning & Auto-Attach",
            desc: isId
              ? "PostgreSQL 16, MySQL 8, Redis 7, dan SQLite dengan injeksi variabel lingkungan otomatis."
              : "PostgreSQL 16, MySQL 8, Redis 7, and SQLite with automatic environment variable injection.",
          },
          {
            title: isId ? "Routing Zero-Downtime & SSL Let's Encrypt" : "Zero-Downtime Routing & Let's Encrypt SSL",
            desc: isId
              ? "Reverse proxy Traefik dinamis dengan pengujian health check sebelum pengalihan traffic."
              : "Dynamic Traefik reverse proxy with health check probe verification before traffic cutover.",
          },
          {
            title: isId ? "Enkripsi Rahasia AES-256-GCM" : "AES-256-GCM Secret Encryption",
            desc: isId
              ? "Enkripsi simetris untuk variabel lingkungan sensitif, token API, dan master key."
              : "Symmetric encryption for environment variables, API tokens, and credentials.",
          },
          {
            title: isId ? "Terminal Web Interaktif" : "Interactive Web Terminal",
            desc: isId
              ? "Akses shell peramban xterm.js langsung ke dalam container aplikasi yang aktif."
              : "xterm.js browser shell directly into running application containers.",
          },
          {
            title: isId ? "Portal Dokumentasi & Asisten AI" : "Documentation Portal & Ask AI Assistant",
            desc: isId
              ? "Panduan terorganisir, blok kode yang dapat disalin, dan asisten percakapan cerdas."
              : "Categorized guides, copyable code blocks, and AI chat assistant.",
          },
        ],
      },
      {
        stage: isId ? "Sedang Dikembangkan (v1.2.0)" : "In Active Development (v1.2.0)",
        description: isId
          ? "Fitur yang saat ini sedang diimplementasikan dan diuji untuk rilis minor mendatang."
          : "Features currently being implemented and tested for upcoming minor releases.",
        badge: isId ? "Dalam Proses" : "In Progress",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        items: [
          {
            title: isId ? "Backup Volume S3 Otomatis" : "Automated Off-Site S3 Volume Backups",
            desc: isId
              ? "Jadwal backup snapshot ke Amazon S3, Cloudflare R2, atau endpoint kompatibel S3 kustom."
              : "Scheduled snapshot backups to Amazon S3, Cloudflare R2, or custom S3-compatible endpoints.",
          },
          {
            title: isId ? "Rollback Hash Image 1-Klik" : "1-Click Instant Image Hash Rollback",
            desc: isId
              ? "Integrasi UI penuh untuk pemulihan instan tanpa build ulang ke hash image yang deploy sebelumnya."
              : "Full UI integration for instant zero-rebuild recovery to previously deployed image hashes.",
          },
          {
            title: isId ? "Probe Healthcheck Kustom" : "Custom Healthcheck Probes",
            desc: isId
              ? "Konfigurasi path HTTP, kode status yang diharapkan, interval probe, dan batas timeout."
              : "Configurable HTTP path, expected status codes, probe intervals, and timeout thresholds.",
          },
        ],
      },
      {
        stage: isId ? "Rencana Masa Depan (Arsitektur v2.0)" : "Future Roadmap (v2.0 Architecture)",
        description: isId
          ? "Kemampuan besar terencana yang dirancang untuk skala infrastruktur multi-server."
          : "Planned major capabilities designed for multi-server infrastructure scale.",
        badge: isId ? "Direncanakan" : "Planned",
        badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
        items: [
          {
            title: isId ? "Agent Cluster Multi-VPS" : "Multi-VPS Cluster Agent",
            desc: isId
              ? "Kelola banyak VPS Linux jarak jauh dari satu control plane sPanel terpusat."
              : "Manage multiple remote Linux VPS hosts from one centralized sPanel control plane.",
          },
          {
            title: isId ? "Kolaborasi Tim & RBAC" : "Team Collaboration & RBAC",
            desc: isId
              ? "Izin akses berbasis peran, undangan tim, dan log audit untuk banyak administrator."
              : "Role-based access permissions, team invites, and audit logs for multiple administrators.",
          },
          {
            title: isId ? "Marketplace Open-Source 1-Klik" : "1-Click Open-Source Marketplace",
            desc: isId
              ? "Template siap pakai untuk WordPress, Ghost, Directus, Supabase, dan Meilisearch."
              : "Pre-configured templates for WordPress, Ghost, Directus, Supabase, and Meilisearch.",
          },
        ],
      },
    ],
    [isId]
  );

  return (
    <div className="min-h-screen bg-slate-50 border-b border-slate-200 py-12 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-mono">
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>{t("roadmap.badge")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t("roadmap.title")}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t("roadmap.subtitle")}
          </p>
        </div>

        {/* Roadmap Stages */}
        <div className="space-y-10">
          {sections.map((sec, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {sec.stage}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sec.description}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold font-mono border self-start sm:self-center ${sec.badgeColor}`}
                >
                  {sec.badge}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sec.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1.5"
                  >
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      <span>{item.title}</span>
                    </h3>
                    <p className="text-[11px] text-slate-600 leading-relaxed pl-3.5">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contribute card */}
        <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-sm font-bold text-slate-900">{t("roadmap.cta_title")}</h3>
            <p className="text-xs text-slate-600">
              {t("roadmap.cta_desc")}
            </p>
          </div>
          <a
            href="https://github.com/azka13labib-ops/Spanel/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition w-full sm:w-auto flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
          >
            <span>{t("roadmap.cta_btn")}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

