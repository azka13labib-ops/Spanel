"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { GitCommit, Tag, ArrowRight, CheckCircle2, Terminal } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function ChangelogPage() {
  const { t, locale } = useLanguage();
  const isId = locale === "id";

  const releases = useMemo(
    () => [
      {
        version: "v1.1.0",
        date: isId ? "Oktober 2026" : "October 2026",
        tag: isId ? "Rilis Terbaru" : "Latest Release",
        summary: isId
          ? "Portal Dokumentasi, Asisten AI Docs Interaktif, dan desain ulang antarmuka Manajemen Database SaaS."
          : "Documentation Portal, Interactive AI Docs Assistant, and Database Management SaaS redesign.",
        changes: [
          {
            type: isId ? "Fitur" : "Feature",
            text: isId
              ? "Portal Dokumentasi interaktif dengan fitur pencarian, pohon kategori, dan Asisten AI Docs."
              : "Interactive Documentation Portal with search, category tree, and Ask AI Docs Assistant.",
          },
          {
            type: isId ? "Fitur" : "Feature",
            text: isId
              ? "Penyempurnaan antarmuka Manajemen Database dengan status container Docker nyata dan injeksi variabel lingkungan otomatis (Laravel, Prisma, Redis)."
              : "Redesigned Database Management UI with real Docker container status and auto-attach environment variable injection (Laravel, Prisma, Redis).",
          },
          {
            type: isId ? "Perbaikan" : "Fix",
            text: isId
              ? "Mengatasi kendala crash layer Docker dan mencegah false logout sesi saat upstream mengembalikan 503."
              : "Resolved Docker layer crashes and prevented false session logouts when upstream returns 503.",
          },
          {
            type: isId ? "Perbaikan" : "Fix",
            text: isId
              ? "Pengecualian endpoint health check dan dukungan HTTP tanpa enkripsi di Tailscale (100.x.x.x) dan IP LAN privat."
              : "Exempted health check endpoints and added support for unencrypted HTTP on Tailscale (100.x.x.x) and private LAN IPs.",
          },
          {
            type: isId ? "Peningkatan" : "Improvement",
            text: isId
              ? "Navigasi subtab langsung dan penghapusan fallback pembuatan proyek dummy di dashboard admin."
              : "Wired direct subtab navigation and eliminated dummy project creation fallbacks in the admin dashboard.",
          },
        ],
      },
      {
        version: "v1.0.0",
        date: isId ? "September 2026" : "September 2026",
        tag: isId ? "Rilis Perdana" : "Initial Release",
        summary: isId
          ? "Rilis produksi perdana sPanel: Platform as a Service mandiri dengan Single-Binary Go sejati."
          : "First production release of sPanel: True Single-Binary Self-Hosted PaaS.",
        changes: [
          {
            type: isId ? "Fitur" : "Feature",
            text: isId
              ? "Distribusi single-binary Linux (Go Fiber) menyematkan export statis Next.js tanpa perlu Node.js di server host."
              : "Single Linux binary distribution (Go Fiber) embedding static Next.js export with zero Node.js host requirement.",
          },
          {
            type: isId ? "Fitur" : "Feature",
            text: isId
              ? "Database SQLite tertanam dalam mode WAL (journal_mode=WAL; busy_timeout=5000) untuk operasi tulis konkurensi tinggi."
              : "Embedded SQLite database in WAL mode (journal_mode=WAL; busy_timeout=5000) for concurrent non-blocking writes.",
          },
          {
            type: isId ? "Fitur" : "Feature",
            text: isId
              ? "Sandbox build Nixpacks berjalan di dalam container sementara untuk melindungi infrastruktur Linux host."
              : "Ephemeral Nixpacks build sandbox running inside temporary containers to protect host Linux infrastructure.",
          },
          {
            type: isId ? "Fitur" : "Feature",
            text: isId
              ? "Reverse proxy Traefik dengan deteksi label Docker otomatis dan penerbitan sertifikat TLS Let's Encrypt."
              : "Traefik reverse proxy with automatic Docker label discovery and Let's Encrypt TLS certificate generation.",
          },
          {
            type: isId ? "Fitur" : "Feature",
            text: isId
              ? "Enkripsi AES-256-GCM untuk seluruh variabel lingkungan sensitif, master secret key, dan token API."
              : "AES-256-GCM encryption for all sensitive environment variables, master secret keys, and API tokens.",
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
            <Tag className="w-3.5 h-3.5" />
            <span>{t("changelog.badge")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t("changelog.title")}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t("changelog.subtitle")}
          </p>
        </div>

        {/* Releases Timeline */}
        <div className="space-y-8">
          {releases.map((rel, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900 font-mono">
                    {rel.version}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
                    {rel.tag}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {rel.date}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {rel.summary}
              </p>

              <div className="space-y-2.5">
                {rel.changes.map((item, cIdx) => (
                  <div key={cIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono shrink-0 font-semibold ${
                        item.type === "Feature" || item.type === "Fitur"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : item.type === "Fix" || item.type === "Perbaikan"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* GitHub releases link */}
        <div className="p-6 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-0.5 text-center sm:text-left">
            <h3 className="text-xs font-bold text-slate-900">
              {isId ? "Ingin melihat seluruh riwayat commit?" : "Want to see all commits?"}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isId
                ? "Lihat log commit lengkap, pull request, dan rilis di repositori GitHub kami."
                : "Browse full commit logs, pull requests, and releases on our GitHub repository."}
            </p>
          </div>
          <a
            href="https://github.com/azka13labib-ops/Spanel/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs"
          >
            <span>{isId ? "Rilis GitHub" : "GitHub Releases"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

