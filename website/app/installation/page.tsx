"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Terminal,
  Check,
  Copy,
  Server,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function InstallationPage() {
  const [activeTab, setActiveTab] = useState<"binary" | "source" | "docker">("binary");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const binaryCode = `# 1. Download the latest release binary for Linux (amd64)
curl -fsSL https://github.com/azka13labib-ops/Spanel/releases/download/v1.1.0/spanel_linux_amd64 -o spanel

# 2. Grant executable permissions
chmod +x spanel

# 3. Start sPanel
./spanel`;

  const sourceCode = `# 1. Clone the repository
git clone https://github.com/azka13labib-ops/Spanel.git
cd Spanel

# 2. Build the Next.js embedded frontend
cd web
npm install
npm run build
cd ..

# 3. Compile the single Go binary
go build -o spanel ./cmd/server

# 4. Run sPanel
./spanel`;

  const systemdCode = `[Unit]
Description=sPanel Zero-Config AI-Powered Self-Hosted PaaS
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
    <div className="min-h-screen py-12 md:py-20 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-mono">
            <Terminal className="w-3.5 h-3.5" />
            <span>Getting Started</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Installation Guide
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Follow these verified steps to get sPanel up and running on your Linux VPS infrastructure.
          </p>
        </div>

        {/* 1. System Requirements Section */}
        <div id="requirements" className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <span>System Requirements</span>
            </h2>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
              Prerequisites
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-700 font-semibold">
                  <th className="px-6 py-3">Component</th>
                  <th className="px-6 py-3">Specification</th>
                  <th className="px-6 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                <tr>
                  <td className="px-6 py-3.5 font-sans font-semibold text-slate-900">Operating System</td>
                  <td className="px-6 py-3.5 text-indigo-600 font-bold">Ubuntu 22.04 LTS / Debian 12</td>
                  <td className="px-6 py-3.5 text-slate-500 font-sans">Recommended distribution</td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5 font-sans font-semibold text-slate-900">CPU Architecture</td>
                  <td className="px-6 py-3.5">x86_64 (amd64) / aarch64 (arm64)</td>
                  <td className="px-6 py-3.5 text-slate-500 font-sans">Intel, AMD, Ampere Altra</td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5 font-sans font-semibold text-slate-900">Docker Engine</td>
                  <td className="px-6 py-3.5 text-indigo-600 font-bold">20.10+</td>
                  <td className="px-6 py-3.5 text-slate-500 font-sans">Daemon must be running with socket access</td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5 font-sans font-semibold text-slate-900">Memory (RAM)</td>
                  <td className="px-6 py-3.5">2GB minimum (4GB recommended)</td>
                  <td className="px-6 py-3.5 text-slate-500 font-sans">Allows running container apps & DBs</td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5 font-sans font-semibold text-slate-900">Disk Space</td>
                  <td className="px-6 py-3.5">20GB minimum</td>
                  <td className="px-6 py-3.5 text-slate-500 font-sans">SSD/NVMe for Docker layers and databases</td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5 font-sans font-semibold text-slate-900">Network Ports</td>
                  <td className="px-6 py-3.5">8090 (Dashboard), 80, 443 (Traefik)</td>
                  <td className="px-6 py-3.5 text-slate-500 font-sans">Inbound firewall open</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Installation Methods Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <span>Install sPanel</span>
            </h2>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/80 text-xs font-medium">
              <button
                onClick={() => setActiveTab("binary")}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  activeTab === "binary"
                    ? "bg-white text-indigo-700 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Binary (Linux)
              </button>
              <button
                onClick={() => setActiveTab("source")}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  activeTab === "source"
                    ? "bg-white text-indigo-700 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                From Source
              </button>
              <button
                onClick={() => setActiveTab("docker")}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  activeTab === "docker"
                    ? "bg-white text-indigo-700 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Docker (Planned)
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {activeTab === "binary" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">
                  Execute the standalone pre-compiled Linux binary. The backend embeds all frontend assets; no Node.js runtime is required on the host.
                </p>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-sm">
                  <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>bash (terminal)</span>
                    <button
                      onClick={() => handleCopy(binaryCode, 1)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer text-[11px]"
                    >
                      {copiedIndex === 1 ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono overflow-x-auto text-slate-200 leading-relaxed">
                    <code>{binaryCode}</code>
                  </pre>
                </div>
              </div>
            )}

            {activeTab === "source" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">
                  Build from the official source repository. Requires Go 1.22+ and Node.js 18+ on the compiling machine.
                </p>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-sm">
                  <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>bash (source build)</span>
                    <button
                      onClick={() => handleCopy(sourceCode, 2)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer text-[11px]"
                    >
                      {copiedIndex === 2 ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono overflow-x-auto text-slate-200 leading-relaxed">
                    <code>{sourceCode}</code>
                  </pre>
                </div>
              </div>
            )}

            {activeTab === "docker" && (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-800">
                  Docker Compose Package (Coming in v1.2.0)
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Running sPanel itself inside a Docker container requires mounting <code className="font-mono text-indigo-600">/var/run/docker.sock</code> for socket sharing. For optimal performance and minimal layer indirection, the standalone Linux binary is currently the primary distribution method.
                </p>
              </div>
            )}

            {/* Success Note Callout */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span>After starting sPanel, navigate to </span>
                <code className="font-mono font-bold bg-emerald-100/70 px-1 py-0.5 rounded text-emerald-900">
                  http://&lt;your-server-ip&gt;:8090
                </code>
                <span> in your web browser.</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Run as Systemd Service */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
              3
            </span>
            <span>Configure Systemd Service (Auto-Start on Boot)</span>
          </h2>
          <p className="text-xs text-slate-600">
            Create a systemd unit file at <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-600">/etc/systemd/system/spanel.service</code> so sPanel restarts automatically after reboots or unexpected crashes:
          </p>

          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-sm">
            <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>/etc/systemd/system/spanel.service</span>
              <button
                onClick={() => handleCopy(systemdCode, 3)}
                className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer text-[11px]"
              >
                {copiedIndex === 3 ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto text-slate-200 leading-relaxed">
              <code>{systemdCode}</code>
            </pre>
          </div>

          <p className="text-xs text-slate-600 pt-2">
            Enable and start the service:
          </p>
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-sm">
            <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>bash</span>
              <button
                onClick={() => handleCopy(enableSystemdCode, 4)}
                className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer text-[11px]"
              >
                {copiedIndex === 4 ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto text-slate-200 leading-relaxed">
              <code>{enableSystemdCode}</code>
            </pre>
          </div>
        </div>

        {/* 4. Secure Password Setup */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
              4
            </span>
            <span>Set Initial Administrator Password via CLI</span>
          </h2>
          <p className="text-xs text-slate-600">
            sPanel generates a random master encryption key on first run. To set your initial administrator password securely without exposing it in shell history:
          </p>

          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-sm">
            <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>bash (secure stdin pipe)</span>
              <button
                onClick={() => handleCopy(passwordResetCode, 5)}
                className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer text-[11px]"
              >
                {copiedIndex === 5 ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto text-slate-200 leading-relaxed">
              <code>{passwordResetCode}</code>
            </pre>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Security Note: </span>
              Passwords must never be passed as CLI arguments (<code className="font-mono">spanel reset-password &lt;pass&gt;</code>) because they would be visible to other server users via <code className="font-mono">ps aux</code> and recorded in your shell history.
            </div>
          </div>
        </div>

        {/* Next Step Banner */}
        <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">Installed and ready?</h3>
            <p className="text-xs text-slate-600">
              Proceed to our Deployment Guide to connect GitHub and deploy your first application.
            </p>
          </div>
          <Link
            href="/docs/deployment/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shrink-0 shadow-xs"
          >
            <span>Deployment Guide</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
