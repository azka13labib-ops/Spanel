"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Database,
  Server,
  Layers,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  Lock,
  Terminal,
  Cpu,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function DatabasesDocPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/docs/" className="hover:text-slate-900 transition">
          {t("docs.breadcrumb_root")}
        </Link>
        <span>&gt;</span>
        <span className="text-slate-900 font-semibold">{t("docs.db.breadcrumb")}</span>
      </nav>

      {/* Hero Header */}
      <div className="space-y-2.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
          <Database className="w-3.5 h-3.5" />
          <span>{t("docs.db.badge")}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {t("docs.db.title")}
        </h1>
        <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
          {t("docs.db.subtitle")}
        </p>
      </div>

      {/* Supported Databases Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900">PostgreSQL 16</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              SQL Engine
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Database relasional standar industri dengan dukungan JSONB, ekstensi pgvector, dan performa konkurensi tinggi.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100">
            Port Internal: :5432
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900">MySQL 8.0</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
              SQL Engine
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pilihan ideal untuk ekosistem PHP, Laravel, WordPress, dan CMS dengan InnoDB engine default.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100">
            Port Internal: :3306
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900">Redis 7.x</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
              In-Memory Cache
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            In-memory key-value store ultra-cepat untuk session handler, cache query, dan message broker queue (BullMQ, Laravel Queue).
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100">
            Port Internal: :6379
          </div>
        </div>
      </div>

      {/* Internal Networking Section */}
      <div id="networking" className="space-y-4 pt-4 border-t border-slate-200 scroll-mt-24">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Konektivitas Jaringan Internal (Bridge Network Terisolasi)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Database Anda aman dari serangan internet publik karena tidak perlu membuka port ke IP publik VPS.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Semua database yang di-deploy melalui sPanel terhubung ke Docker network bersama bernama <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">spanel-network</code>.
            Aplikasi Anda dapat menghubungi database secara langsung menggunakan nama hostname internal kontainer:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs space-y-1">
              <div className="text-slate-400 text-[10px]"># Format Koneksi PostgreSQL (Prisma / Drizzle)</div>
              <div className="text-emerald-400">DATABASE_URL=&quot;postgresql://dbuser:password@postgres:5432/dbname&quot;</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs space-y-1">
              <div className="text-slate-400 text-[10px]"># Format Koneksi MySQL (Laravel .env)</div>
              <div className="text-emerald-400">DB_CONNECTION=mysql<br/>DB_HOST=mysql<br/>DB_PORT=3306<br/>DB_DATABASE=app_prod</div>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Storage & Volumes */}
      <div id="volumes" className="space-y-4 pt-4 border-t border-slate-200 scroll-mt-24">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            <span>Penyimpanan Data Persisten (Host Mount Volume)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Data database tetap tersimpan dengan aman di disk host meskipun aplikasi atau container di-rebuild.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            sPanel secara otomatis memasang (*mount*) volume lokal di server VPS Anda. Lokasi fisik data tersimpan di:
          </p>
          <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 font-mono text-slate-800 text-xs">
            /opt/spanel/data/volumes/&lt;nama-database&gt;/
          </div>
          <p>
            Saat container di-restart, di-update, atau di-redeploy, data tabel dan indeks tidak akan pernah terhapus karena terikat ke direktori host yang persisten.
          </p>
        </div>
      </div>

      {/* Backup and Restore Strategies */}
      <div id="backups" className="space-y-4 pt-4 border-t border-slate-200 scroll-mt-24">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-600" />
            <span>Strategi Backup &amp; Restore</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cara mengambil dump database berkala langsung dari host VPS.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs space-y-2">
            <div className="text-slate-400 text-[11px]"># 1. Backup PostgreSQL ke file SQL terkompresi</div>
            <div className="text-emerald-400">docker exec -t spanel-db-postgres pg_dump -U dbuser dbname | gzip &gt; backup_$(date +%F).sql.gz</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs space-y-2">
            <div className="text-slate-400 text-[11px]"># 2. Restore file backup ke database PostgreSQL</div>
            <div className="text-emerald-400">gunzip &lt; backup_2026-10-13.sql.gz | docker exec -i spanel-db-postgres psql -U dbuser -d dbname</div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
        <Link
          href="/docs/deployment/"
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Panduan Deployment</span>
        </Link>
        <Link
          href="/docs/domains-ssl/"
          className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
        >
          <span>Domain &amp; SSL Let&apos;s Encrypt</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
