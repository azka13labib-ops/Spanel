"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  LifeBuoy,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  HelpCircle,
  ExternalLink,
  Zap,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { useLanguage } from "@/context/LanguageContext";

export default function TroubleshootingDocPage() {
  const { t } = useLanguage();

  const issues = [
    {
      id: "git-timeout",
      title: "1. Git Clone Timeout (Failed to connect to github.com port 443)",
      badge: "Network / IPv6",
      cause:
        "Sebagian besar provider VPS di Indonesia mengalami kendala routing IPv6 ke GitHub. Linux mencoba terhubung ke alamat IPv6 GitHub terlebih dahulu, mengalami blackhole, dan menggantung selama ~130 detik sebelum timeout.",
      solution: (
        <div className="space-y-2">
          <p>Nonaktifkan IPv6 di server VPS Anda agar koneksi otomatis menggunakan IPv4 murni:</p>
          <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto">
            sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1<br />
            sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1
          </div>
          <p className="text-[11px] text-slate-500">
            Tes koneksi dengan: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">curl -I https://github.com</code>.
          </p>
        </div>
      ),
    },
    {
      id: "502",
      title: "2. Error 502 Bad Gateway di Traefik",
      badge: "Routing / Port",
      cause:
        "Traefik berhasil mengarahkan domain ke container, tetapi container aplikasi Anda menolak koneksi atau belum siap menerima request (Health check gagal atau Target Port salah).",
      solution: (
        <div className="space-y-2">
          <ul className="list-disc pl-4 space-y-1 text-slate-600">
            <li>
              <strong>Cek Target Port:</strong> Buka Project Settings. Pastikan Target Port cocok dengan port aplikasi Anda (misal: Next.js = 3000, Laravel = 8000/80).
            </li>
            <li>
              <strong>Periksa Container Runtime Logs:</strong> Buka tab Logs di dashboard untuk memeriksa apakah aplikasi mengalami runtime crash atau exception saat booting.
            </li>
            <li>
              <strong>Tunggu beberapa detik:</strong> Beberapa framework seperti Next.js SSR membutuhkan 3–5 detik untuk compile halaman pertama kali.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "swap",
      title: "3. Build Gagal / Macet Karena Out of Memory (OOM Killer)",
      badge: "VPS RAM / Swap",
      cause:
        "Framework modern seperti Next.js atau Vite membutuhkan RAM minimal 2GB–3GB saat proses kompilasi `npm run build`. Pada VPS dengan RAM 1GB–2GB, kernel Linux akan mematikan proses build (OOM Killed).",
      solution: (
        <div className="space-y-2">
          <p>Tambahkan 2GB Swap Memory di server VPS Anda agar build berjalan lancar:</p>
          <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto">
            sudo fallocate -l 2G /swapfile<br />
            sudo chmod 600 /swapfile<br />
            sudo mkswap /swapfile<br />
            sudo swapon /swapfile<br />
            echo &apos;/swapfile none swap sw 0 0&apos; | sudo tee -a /etc/fstab
          </div>
        </div>
      ),
    },
    {
      id: "ports",
      title: "4. Port 80 atau 443 Sudah Dipakai Layanan Lain (Port Conflict)",
      badge: "Port Conflict",
      cause:
        "Jika VPS sebelumnya pernah dipasangi Nginx, Apache, atau Caddy bawaan OS, Traefik tidak bisa mengikat port 80 dan 443 sehingga reverse proxy gagal berjalan.",
      solution: (
        <div className="space-y-2">
          <p>Matikan dan nonaktifkan web server bawaan di VPS:</p>
          <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto">
            sudo systemctl stop nginx apache2 2&gt;/dev/null<br />
            sudo systemctl disable nginx apache2 2&gt;/dev/null
          </div>
          <p className="text-[11px] text-slate-500">
            Lalu restart sPanel: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">sudo systemctl restart spanel</code>.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/docs/" className="hover:text-slate-900 transition">
          {t("docs.breadcrumb_root")}
        </Link>
        <span>&gt;</span>
        <span className="text-slate-900 font-semibold">{t("docs.faq.breadcrumb")}</span>
      </nav>

      {/* Hero Header */}
      <div className="space-y-2.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200/60 text-rose-700 text-xs font-semibold">
          <LifeBuoy className="w-3.5 h-3.5" />
          <span>{t("docs.faq.badge")}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {t("docs.faq.title")}
        </h1>
        <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
          {t("docs.faq.subtitle")}
        </p>
      </div>

      {/* Issues List */}
      <div className="space-y-6">
        {issues.map((item) => (
          <div
            key={item.id}
            id={item.id}
            className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5 scroll-mt-24"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold shrink-0">
                {item.badge}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Penyebab: </span>
              {item.cause}
            </div>

            <div className="text-xs text-slate-700 leading-relaxed pt-1">
              <div className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                Solusi &amp; Penanganan:
              </div>
              {item.solution}
            </div>
          </div>
        ))}
      </div>

      {/* Community Callout */}
      <div className="p-6 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-bold text-sm text-slate-900">Masih belum menemukan jawaban?</h3>
          <p className="text-xs text-slate-600">
            Kunjungi issue tracker di GitHub atau buka diskusi untuk berdiskusi dengan komunitas.
          </p>
        </div>
        <a
          href="https://github.com/azka13labib-ops/Spanel/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-11 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-xs w-full sm:w-auto shrink-0"
        >
          <GithubIcon className="w-4 h-4" />
          <span>Buka Issue di GitHub</span>
        </a>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/docs/server-management/"
          className="min-h-11 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Operasional &amp; Manajemen Server</span>
        </Link>
        <Link
          href="/docs/"
          className="min-h-11 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
        >
          <span>Kembali ke Ringkasan</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
