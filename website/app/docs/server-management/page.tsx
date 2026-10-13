"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Server,
  Activity,
  Terminal,
  RotateCcw,
  Cpu,
  Layers,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function ServerManagementDocPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/docs/" className="hover:text-slate-900 transition">
          {t("docs.breadcrumb_root")}
        </Link>
        <span>&gt;</span>
        <span className="text-slate-900 font-semibold">{t("docs.ops.breadcrumb")}</span>
      </nav>

      {/* Hero Header */}
      <div className="space-y-2.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200/60 text-purple-700 text-xs font-semibold">
          <Server className="w-3.5 h-3.5" />
          <span>{t("docs.ops.badge")}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {t("docs.ops.title")}
        </h1>
        <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
          {t("docs.ops.subtitle")}
        </p>
      </div>

      {/* Container Operations Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Kontrol Lifecycle</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Mulai, hentikan, dan nyalakan ulang container aplikasi dengan proteksi modal konfirmasi untuk mencegah kesalahan tidak sengaja.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
            <Terminal className="w-4 h-4 text-emerald-600" />
            <span>Terminal Web (xterm.js)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Masuk ke sesi terminal interaktif kontainer langsung dari browser Anda tanpa harus login SSH manual ke server host.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>1-Click Rollback</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Jika build baru mengalami kendala di produksi, kembalikan container ke image sehat sebelumnya dalam hitungan detik.
          </p>
        </div>
      </div>

      {/* Real-time Logs Streaming Section */}
      <div id="logs" className="space-y-4 pt-4 border-t border-slate-200 scroll-mt-24">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>Streaming Log Real-Time (WebSockets &amp; SSE)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Dua jenis log terpisah untuk pemantauan menyeluruh: Build Logs dan Container Runtime Logs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs text-slate-600 leading-relaxed">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>1. Build &amp; Deployment Logs</span>
            </div>
            <p>
              Menampilkan proses clone git, deteksi Nixpacks, resolusi dependensi NPM/Composer, dan kompilasi image Docker. Disimpan di <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">data/logs/&lt;deploy-id&gt;.log</code>.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs text-slate-600 leading-relaxed">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>2. Container Runtime Logs</span>
            </div>
            <p>
              Streaming langsung output <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">stdout</code> dan <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">stderr</code> dari aplikasi yang sedang berjalan di Docker. Membantu melihat error 500, unhandled promise, atau log database secara instan.
            </p>
          </div>
        </div>
      </div>

      {/* Web Terminal Guide */}
      <div id="terminal" className="space-y-4 pt-4 border-t border-slate-200 scroll-mt-24">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            <span>Penggunaan Web Terminal di Dashboard</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Perintah praktis yang sering dijalankan di terminal kontainer.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs space-y-3">
          <div className="text-slate-400 text-[11px] pb-1 border-b border-slate-800">
            # Jalankan migrasi database di Laravel
          </div>
          <div className="text-emerald-400">php artisan migrate --force</div>
          <div className="text-slate-400 text-[11px] pt-2 pb-1 border-b border-slate-800">
            # Jalankan Prisma migration / seeder di Next.js
          </div>
          <div className="text-emerald-400">npx prisma migrate deploy &amp;&amp; npx prisma db seed</div>
          <div className="text-slate-400 text-[11px] pt-2 pb-1 border-b border-slate-800">
            # Membersihkan cache aplikasi
          </div>
          <div className="text-emerald-400">php artisan optimize:clear</div>
        </div>
      </div>

      {/* Resource Monitoring & Auto-Restart */}
      <div id="monitoring" className="space-y-4 pt-4 border-t border-slate-200 scroll-mt-24">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <span>Monitoring Resource &amp; Kebijakan Auto-Restart</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Menjaga uptime aplikasi dengan restart otomatis saat crash.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Semua container yang dibuat oleh sPanel otomatis dilengkapi kebijakan Docker:
          </p>
          <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 font-mono text-slate-800 text-xs">
            --restart unless-stopped
          </div>
          <p>
            Jika aplikasi mengalami crash atau memory spike melebihi alokasi, Docker daemon akan segera menyalakan ulang container dalam hitungan detik untuk meminimalkan downtime.
          </p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
        <Link
          href="/docs/domains-ssl/"
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Domain &amp; SSL</span>
        </Link>
        <Link
          href="/docs/troubleshooting/"
          className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
        >
          <span>Pemecahan Masalah (FAQ)</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
