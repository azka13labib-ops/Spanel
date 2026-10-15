"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Terminal,
  Check,
  Copy,
  Server,
  Layers,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Cpu,
  HardDrive,
  Globe,
  Rocket,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function InstallationPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"binary" | "source">("binary");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const prepareServerCode = `sudo apt update && sudo apt upgrade -y`;

  const binaryCode = `# Download the verified standalone Linux binary
curl -fsSL https://github.com/azka13labib-ops/Spanel/releases/download/v1.1.0/spanel_linux_amd64 -o spanel

# Grant executable permission and run sPanel
chmod +x spanel && ./spanel`;

  const sourceCode = `# Clone repository and enter directory
git clone https://github.com/azka13labib-ops/Spanel.git && cd Spanel

# Build embedded frontend
cd web && pnpm install && pnpm build && cd ..

# Compile single Go binary and start server
go build -o spanel ./cmd/server && ./spanel`;

  const systemdCode = `[Unit]
Description=sPanel Zero-Config Single-Binary Self-Hosted PaaS
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/home/ubuntu/spanel
Environment="PORT=8090"
Environment="DATA_DIR=/home/ubuntu/spanel/data"
Environment="SPANEL_ALLOW_INSECURE_HTTP=true"
ExecStart=/home/ubuntu/spanel/spanel
Restart=always
RestartSec=3s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target`;

  const enableSystemdCode = `sudo systemctl daemon-reload
sudo systemctl enable --now spanel
sudo systemctl status spanel`;

  const passwordResetCode = `# Set or reset initial administrator password via secure stdin pipe:
echo 'YourSecurePassword123' | /home/ubuntu/spanel/spanel reset-password`;

  return (
    <div className="min-h-screen py-10 md:py-16 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Breadcrumb & Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
            <span>&gt;</span>
            <span>{t("install.breadcrumb")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-slate-900 tracking-tight">
            {t("install.title")}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
            {t("install.subtitle")}
          </p>
        </div>

        {/* System Requirements Card (Matches Mockup Left Screen) */}
        <div
          id="requirements"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-5"
        >
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {t("install.req.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Linux VPS */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <Terminal className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t("install.req.os_title")}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900">
                {t("install.req.os_desc")}
              </p>
              <p className="text-[11px] text-slate-500">
                {t("install.req.os_arch")}
              </p>
            </div>

            {/* 2. Docker Engine */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t("install.req.docker_title")}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900">
                {t("install.req.docker_desc")}
              </p>
              <p className="text-[11px] text-slate-500">
                {t("install.req.docker_socket")}
              </p>
            </div>

            {/* 3. Memory (RAM) */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t("install.req.ram_title")}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900">
                {t("install.req.ram_desc")}
              </p>
              <p className="text-[11px] text-slate-500">
                {t("install.req.ram_storage")}
              </p>
            </div>

            {/* 4. Network Ports */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t("install.req.ports_title")}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900">
                {t("install.req.ports_desc")}
              </p>
              <p className="text-[11px] text-slate-500">
                {t("install.req.ports_firewall")}
              </p>
            </div>
          </div>
        </div>

        {/* Installation Steps Section */}
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t("install.steps.title")}
          </h2>

          <div className="space-y-6">
            {/* Step 1: Prepare your server */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {t("install.step1.title")}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {t("install.step1.desc")}
                  </p>
                </div>
              </div>

              {/* Code Block */}
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-xs">
                <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-indigo-400">&gt;_</span> bash
                  </span>
                  <button
                    onClick={() => handleCopy(prepareServerCode, "step1")}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 hover:text-white transition cursor-pointer text-xs focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    {copiedId === "step1" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">{t("common.copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-300" />
                        <span>{t("common.copy")}</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs sm:text-[13px] font-mono overflow-x-auto text-slate-200 leading-relaxed">
                  <code>{prepareServerCode}</code>
                </pre>
              </div>
            </div>

            {/* Step 2: Install sPanel */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {t("install.step2.title")}
                    </h3>

                    {/* Method Tabs */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium shrink-0">
                      <button
                        onClick={() => setActiveTab("binary")}
                        className={`px-3 py-1 rounded-md transition cursor-pointer ${
                          activeTab === "binary"
                            ? "bg-white text-indigo-700 font-semibold shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {t("install.tab.binary")}
                      </button>
                      <button
                        onClick={() => setActiveTab("source")}
                        className={`px-3 py-1 rounded-md transition cursor-pointer ${
                          activeTab === "source"
                            ? "bg-white text-indigo-700 font-semibold shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {t("install.tab.source")}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed pt-1">
                    {t("install.step2.desc")}
                  </p>
                </div>
              </div>

              {/* Code Block for Active Tab */}
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-xs">
                <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-indigo-400">&gt;_</span>{" "}
                    {activeTab === "binary" ? t("install.tab.binary_badge") : t("install.tab.source_badge")}
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        activeTab === "binary" ? binaryCode : sourceCode,
                        "step2"
                      )
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 hover:text-white transition cursor-pointer text-xs focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    {copiedId === "step2" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">{t("common.copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-300" />
                        <span>{t("common.copy")}</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs sm:text-[13px] font-mono overflow-x-auto text-slate-200 leading-relaxed">
                  <code>{activeTab === "binary" ? binaryCode : sourceCode}</code>
                </pre>
              </div>

              {/* Security Tip Box (Exact match to Mockup) */}
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {t("install.warning.password")}
                </p>
              </div>
            </div>

            {/* Step 3: Open sPanel and finish setup */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {t("install.step3.title")}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {t("install.step3.desc")}
                  </p>
                </div>
              </div>

              {/* URL Access Pill */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-emerald-900 text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{t("install.url_hint")}</span>
                  <code className="font-mono font-bold bg-emerald-100/80 px-2 py-0.5 rounded text-emerald-950 text-xs sm:text-sm">
                    http://&lt;your-server-ip&gt;:8090
                  </code>
                </div>
                <span className="text-xs text-emerald-700 font-medium">
                  {t("install.url_badge")}
                </span>
              </div>

              {/* Collapsible Advanced: Systemd & Password Reset */}
              <div className="pt-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                >
                  <span>
                    {showAdvanced ? t("common.hide_guide") : t("common.show_guide")}
                  </span>
                  {showAdvanced ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-6 pt-4 border-t border-slate-100 animate-in fade-in-50 duration-150">
                    {/* Systemd Section */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-900">
                        {t("install.systemd.title")}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t("install.systemd.desc")}
                      </p>
                      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-xs">
                        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                          <span>/etc/systemd/system/spanel.service</span>
                          <button
                            onClick={() => handleCopy(systemdCode, "systemd")}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 hover:text-white transition cursor-pointer text-xs"
                          >
                            {copiedId === "systemd" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-medium">{t("common.copied")}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-300" />
                                <span>{t("common.copy")}</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-4 text-xs font-mono overflow-x-auto text-slate-200 leading-relaxed">
                          <code>{systemdCode}</code>
                        </pre>
                      </div>

                      <p className="text-xs text-slate-600 pt-1">
                        {t("install.systemd.enable")}
                      </p>
                      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-xs">
                        <pre className="p-3 text-xs font-mono overflow-x-auto text-slate-200 leading-relaxed">
                          <code>{enableSystemdCode}</code>
                        </pre>
                      </div>
                    </div>

                    {/* Password Reset Section */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {t("install.password.title")}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t("install.password.desc")}
                      </p>
                      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-xs">
                        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                          <span>bash (secure stdin pipe)</span>
                          <button
                            onClick={() => handleCopy(passwordResetCode, "pwd")}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 hover:text-white transition cursor-pointer text-xs"
                          >
                            {copiedId === "pwd" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-medium">{t("common.copied")}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-300" />
                                <span>{t("common.copy")}</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-4 text-xs font-mono overflow-x-auto text-slate-200 leading-relaxed">
                          <code>{passwordResetCode}</code>
                        </pre>
                      </div>
                      <p className="text-xs text-slate-500 italic">
                        {t("install.password.security_note")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ready to deploy your first app? Bottom CTA (Exact Match to Mockup) */}
        <div className="p-6 sm:p-8 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Rocket className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {t("install.cta.title")}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                {t("install.cta.desc")}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full sm:w-auto">
            <Link
              href="/docs/deployment/"
              className="min-h-11 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span>{t("install.cta.deploy_btn")}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/docs/"
              className="min-h-11 flex items-center justify-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {t("install.cta.docs_btn")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
