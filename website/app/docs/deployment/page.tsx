"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function DeploymentGuidePage() {
  const { t } = useLanguage();

  const steps = [
    {
      number: "1",
      title: t("deploy.step1_title"),
      description: t("deploy.step1_desc"),
      details: t("deploy.step1_detail"),
    },
    {
      number: "2",
      title: t("deploy.step2_title"),
      description: t("deploy.step2_desc"),
      details: t("deploy.step2_detail"),
    },
    {
      number: "3",
      title: t("deploy.step3_title"),
      description: t("deploy.step3_desc"),
      details: t("deploy.step3_detail"),
    },
    {
      number: "4",
      title: t("deploy.step4_title"),
      description: t("deploy.step4_desc"),
      details: t("deploy.step4_detail"),
    },
  ];

  return (
    <div className="space-y-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/docs/" className="hover:text-slate-900 transition">
            {t("docs.breadcrumb_root")}
          </Link>
          <span>&gt;</span>
          <span className="text-slate-900 font-semibold">{t("deploy.breadcrumb")}</span>
        </nav>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("deploy.title")}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t("deploy.subtitle")}
          </p>
        </div>

        {/* Prerequisites Box */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span>{t("deploy.prerequisites")}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{t("deploy.prereq_1")}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{t("deploy.prereq_2")}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{t("deploy.prereq_3")}</span>
            </div>
          </div>
        </div>

        {/* Step-by-Step Sequence */}
        <div id="github" className="space-y-6 scroll-mt-24">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              GitHub Deployment Workflow
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Zero Config
            </span>
          </div>

          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {step.number}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {step.title}
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-11">
                {step.description}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 leading-relaxed pl-11 border-t border-slate-100 pt-2 font-mono">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{step.details}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Frameworks Section */}
        <div id="frameworks" className="space-y-4 pt-6 border-t border-slate-200 scroll-mt-24">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Framework-Specific Configurations
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              sPanel detects project languages automatically using Nixpacks.
            </p>
          </div>

          <div className="space-y-4">
            {/* Laravel */}
            <div id="laravel" className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5 scroll-mt-24">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Laravel (PHP 8.2+)</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">php / composer</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Nixpacks automatically runs <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">composer install --optimize-autoloader</code>. Add your <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">APP_KEY</code> in Environment Variables before deploying. sPanel automatically ensures storage permissions and runs database migrations.
              </p>
            </div>

            {/* Next.js */}
            <div id="nextjs" className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5 scroll-mt-24">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Next.js &amp; Node.js</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">node / pnpm / yarn</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Supports Next.js standalone output and SSR out of the box. sPanel passes dynamic <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">PORT</code> injection into the container so Traefik automatically routes traffic without custom nginx configurations.
              </p>
            </div>

            {/* Python (FastAPI / Flask / Django) */}
            <div id="python" className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5 scroll-mt-24">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Python (FastAPI, Flask, Django)</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">python / pip / poetry</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Nixpacks mendeteksi <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">requirements.txt</code> atau <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">pyproject.toml</code> secara otomatis. Masukkan command start (misal: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">uvicorn main:app --host 0.0.0.0 --port $PORT</code>) pada environment variable <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">NIXPACKS_START_CMD</code> jika menggunakan ASGI runner khusus.
              </p>
            </div>

            {/* Docker */}
            <div id="docker" className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5 scroll-mt-24">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Custom Dockerfile</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">docker</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                If your repository contains a root <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">Dockerfile</code>, sPanel switches to native Docker build mode, honoring custom multi-stage build instructions and expose ports.
              </p>
            </div>
          </div>
        </div>

        {/* Environment Variables Section */}
        <div id="env" className="space-y-4 pt-6 border-t border-slate-200 scroll-mt-24">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Environment Variables &amp; Secrets
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Securely store credentials with AES-256-GCM encryption.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs text-slate-600 leading-relaxed">
            <p>
              Environment variables can be defined via the sPanel Project Settings dashboard or uploaded directly as a raw <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">.env</code> file.
            </p>
            <p>
              Values are encrypted in the local SQLite database prior to storage. When containers start, variables are safely injected into container processes without writing unencrypted secrets to disk.
            </p>
          </div>
        </div>

        {/* Domains & HTTPS Section */}
        <div id="domains" className="space-y-4 pt-6 border-t border-slate-200 scroll-mt-24">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Domains &amp; Automatic HTTPS (Traefik)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Automated Let&apos;s Encrypt SSL certificates for your custom domains.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>
              Point your domain&apos;s DNS <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">A Record</code> to your server IP address. In sPanel, add your custom domain in the project routing settings.
            </p>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700">
              example.com &rarr; IN A &lt;YOUR_SERVER_IP&gt;
            </div>
            <p>
              Traefik validates the domain and automatically provisions an SSL certificate via ACME HTTP-01 challenge within 60 seconds.
            </p>
          </div>
        </div>

        {/* Databases Section */}
        <div id="databases" className="space-y-4 pt-6 border-t border-slate-200 scroll-mt-24">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Database Provisioning &amp; Networking
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              1-Click PostgreSQL, MySQL, and Redis container provisioning.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs text-slate-600 leading-relaxed">
            <p>
              Provision managed database containers attached directly to the sPanel internal bridge network. Your applications can connect using private container hostnames (e.g., <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">postgres:5432</code>) without exposing database ports to the public internet.
            </p>
          </div>
        </div>

        {/* Web Terminal & Live Logs Section */}
        <div id="terminal" className="space-y-4 pt-6 border-t border-slate-200 scroll-mt-24">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Web Terminal &amp; Live Logs
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Direct container interaction without needing SSH client access.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs text-slate-600 leading-relaxed">
            <p id="containers">
              sPanel provides real-time container log streaming via Server-Sent Events (SSE). Use the integrated xterm.js terminal to execute artisan commands, inspect files, or run database seeders inside active containers.
            </p>
          </div>
        </div>

        {/* Monitoring & Health Checks */}
        <div id="monitoring" className="space-y-4 pt-6 border-t border-slate-200 scroll-mt-24">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Container Monitoring &amp; Auto-Restart
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Real-time resource utilization and restart policies.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs text-slate-600 leading-relaxed">
            <p>
              Every active application is monitored via Docker Stats API. Memory limits, CPU throttling, and health check thresholds ensure crashed applications restart automatically with zero manual intervention.
            </p>
          </div>
        </div>

        {/* Success Banner */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold">{t("deploy.staging_title")}</span>
            <span>{t("deploy.staging_desc_prefix")}</span>
            <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-bold">
              &lt;app&gt;.&lt;ip&gt;.sslip.io
            </code>
            <span>{t("deploy.staging_desc_suffix")}</span>
          </div>
        </div>

        {/* Prev / Next Navigation */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <Link
            href="/docs/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("deploy.back_btn")}</span>
          </Link>
          <Link
            href="/docs/#architecture"
            className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
          >
            <span>Architecture Overview</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
  );
}

