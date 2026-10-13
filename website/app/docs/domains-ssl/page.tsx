"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Globe,
  Lock,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Server,
  Cloud,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function DomainsDocPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/docs/" className="hover:text-slate-900 transition">
          {t("docs.breadcrumb_root")}
        </Link>
        <span>&gt;</span>
        <span className="text-slate-900 font-semibold">{t("docs.domains.breadcrumb")}</span>
      </nav>

      {/* Hero Header */}
      <div className="space-y-2.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold">
          <Globe className="w-3.5 h-3.5" />
          <span>{t("docs.domains.badge")}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {t("docs.domains.title")}
        </h1>
        <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
          {t("docs.domains.subtitle")}
        </p>
      </div>

      {/* Traefik Automatic Reverse Proxy Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Traefik v3 + Let&apos;s Encrypt Otomatis
            </h2>
            <p className="text-xs text-slate-500">
              Zero-configuration reverse proxy dengan sertifikat HTTPS terbitan gratis dan pembaruan berkala otomatis.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-600 leading-relaxed space-y-2 pt-2 border-t border-slate-100">
          <p>
            sPanel mengelola container Traefik terdedikasi di port 80 dan 443. Ketika Anda menambahkan custom domain di proyek, sPanel menyematkan label Docker standar ke container aplikasi Anda.
            Traefik secara dinamis membaca label tersebut tanpa perlu restart engine, lalu menjalankan ACME HTTP-01 challenge untuk menerbitkan sertifikat TLS resmi dari Let&apos;s Encrypt.
          </p>
        </div>
      </div>

      {/* DNS Configuration Guide */}
      <div id="dns" className="space-y-4 pt-4 border-t border-slate-200 scroll-mt-24">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            <span>Konfigurasi DNS Domain Anda</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Arahkan domain atau subdomain Anda dari registrar (Cloudflare, Namecheap, Niagahoster) ke IP VPS sPanel.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-3">Tipe Record</th>
                  <th className="p-3">Nama (Host)</th>
                  <th className="p-3">Target (Value)</th>
                  <th className="p-3">TTL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="p-3 text-indigo-600 font-bold">A Record</td>
                  <td className="p-3">@ (domain utama)</td>
                  <td className="p-3 font-bold text-slate-900">&lt;IP_VPS_ANDA&gt;</td>
                  <td className="p-3 text-slate-500">Auto / 300s</td>
                </tr>
                <tr>
                  <td className="p-3 text-indigo-600 font-bold">A Record</td>
                  <td className="p-3">api (subdomain)</td>
                  <td className="p-3 font-bold text-slate-900">&lt;IP_VPS_ANDA&gt;</td>
                  <td className="p-3 text-slate-500">Auto / 300s</td>
                </tr>
                <tr>
                  <td className="p-3 text-indigo-600 font-bold">CNAME</td>
                  <td className="p-3">www</td>
                  <td className="p-3">domainanda.com</td>
                  <td className="p-3 text-slate-500">Auto / 300s</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cloudflare Integration Warning & Tips */}
      <div id="cloudflare" className="space-y-4 pt-4 border-t border-slate-200 scroll-mt-24">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Cloud className="w-5 h-5 text-amber-500" />
            <span>Integrasi Cloudflare (Mencegah Error Redirect Loop)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Panduan penting jika Anda menggunakan DNS Cloudflare dengan proxy orange cloud aktif.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>PENTING: Atur Mode SSL Cloudflare ke &quot;Full (Strict)&quot;</span>
          </div>
          <p className="leading-relaxed">
            Jika Anda mengaktifkan proxy Cloudflare (awan oranye) dengan mode SSL bawaan <strong>&quot;Flexible&quot;</strong>, Anda akan mengalami error <strong>ERR_TOO_MANY_REDIRECTS</strong>.
            Hal ini terjadi karena Traefik di sPanel otomatis memaksa HTTPS (port 443), sementara Cloudflare Flexible menghubungi port 80 HTTP.
          </p>
          <div className="p-3 bg-white/90 rounded-xl border border-amber-200 font-mono text-amber-900 text-xs">
            Buka Cloudflare Dashboard &rarr; SSL/TLS &rarr; Pilih opsi &quot;Full&quot; atau &quot;Full (Strict)&quot;.
          </div>
        </div>
      </div>

      {/* Staging Magic Domains */}
      <div id="staging" className="space-y-4 pt-4 border-t border-slate-200 scroll-mt-24">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            <span>Magic Staging Preview (sslip.io)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Preview instan tanpa perlu mendaftarkan domain baru atau menunggu propagasi DNS.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            sPanel secara otomatis menetapkan domain wildcard berbasis IP VPS Anda menggunakan layanan DNS publik <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">sslip.io</code>:
          </p>
          <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs">
            https://&lt;app&gt;.&lt;ip&gt;.sslip.io
          </div>
          <p>
            Alamat staging ini langsung dapat diakses dari browser mana saja dengan sertifikat SSL valid untuk pengujian branch staging sebelum domain utama diarahkan ke produksi.
          </p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
        <Link
          href="/docs/databases/"
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Panduan Database</span>
        </Link>
        <Link
          href="/docs/server-management/"
          className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
        >
          <span>Operasional &amp; Manajemen Server</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
