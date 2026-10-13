"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Terminal,
  Server,
  Layers,
  Globe,
  Database,
  Rocket,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function QuickstartDocPage() {
  const { t } = useLanguage();

  const steps = [
    {
      number: "01",
      title: t("quickstart.step1_title"),
      desc: t("quickstart.step1_desc"),
      cmd: "curl -fsSL https://get.spanel.dev | bash",
      tip: t("quickstart.step1_tip"),
    },
    {
      number: "02",
      title: t("quickstart.step2_title"),
      desc: t("quickstart.step2_desc"),
      cmd: "http://<YOUR_VPS_IP>:8090",
      tip: t("quickstart.step2_tip"),
    },
    {
      number: "03",
      title: t("quickstart.step3_title"),
      desc: t("quickstart.step3_desc"),
      cmd: "Settings -> GitHub Account -> Connect OAuth / Personal Access Token",
      tip: t("quickstart.step3_tip"),
    },
    {
      number: "04",
      title: t("quickstart.step4_title"),
      desc: t("quickstart.step4_desc"),
      cmd: "New Application -> Select Repo -> Click Deploy",
      tip: t("quickstart.step4_tip"),
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
        <span className="text-slate-900 font-semibold">{t("quickstart.breadcrumb")}</span>
      </nav>

      {/* Hero Header */}
      <div className="space-y-2.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5" />
          <span>{t("quickstart.badge")}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {t("quickstart.title")}
        </h1>
        <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
          {t("quickstart.subtitle")}
        </p>
      </div>

      {/* Quick Checklist Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Server className="w-4 h-4 text-indigo-600" />
            <span>Linux VPS Clean</span>
          </div>
          <p className="text-xs text-slate-500">
            Ubuntu 22.04 LTS / Debian 12 dengan Docker Engine terinstall.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Git Repository</span>
          </div>
          <p className="text-xs text-slate-500">
            Proyek Next.js, Laravel, Node, Python, atau Dockerfile di GitHub.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Port 80 &amp; 443</span>
          </div>
          <p className="text-xs text-slate-500">
            Firewall terbuka agar Traefik bisa otomatis menerbitkan SSL Let&apos;s Encrypt.
          </p>
        </div>
      </div>

      {/* Step by Step Breakdown */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {t("quickstart.steps_header")}
        </h2>

        {steps.map((st, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                  {st.number}
                </span>
                <h3 className="text-base font-bold text-slate-900">{st.title}</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Step {idx + 1} of 4</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-11">
              {st.desc}
            </p>

            <div className="ml-11 p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs flex items-center justify-between gap-3 overflow-x-auto shadow-inner">
              <span className="text-emerald-400">$ {st.cmd}</span>
            </div>

            <div className="ml-11 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{st.tip}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Staging URL Preview Box */}
      <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 space-y-2">
        <h3 className="font-bold text-sm text-indigo-900 flex items-center gap-2">
          <Rocket className="w-4 h-4 text-indigo-600" />
          <span>Domain Staging Instan (Zero Config SSL)</span>
        </h3>
        <p className="leading-relaxed text-indigo-800">
          Begitu deployment sukses, sPanel langsung menyediakan domain staging otomatis berformat:
        </p>
        <div className="p-3 bg-white rounded-xl border border-indigo-200/80 font-mono text-indigo-700 font-bold">
          https://&lt;nama-aplikasi&gt;.&lt;ip-vps&gt;.sslip.io
        </div>
        <p className="text-[11px] text-indigo-600">
          Domain ini langsung memiliki sertifikat SSL valid tanpa perlu mendaftarkan custom domain terlebih dahulu!
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
        <Link
          href="/docs/"
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("docs.breadcrumb_overview")}</span>
        </Link>
        <Link
          href="/docs/deployment/"
          className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
        >
          <span>{t("quickstart.next_btn")}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
