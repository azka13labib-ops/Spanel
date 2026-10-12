import React from "react";
import Link from "next/link";
import {
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Terminal,
  BookOpen,
  GitBranch,
  Search,
  Database,
  Globe,
  Activity,
  Shield,
  Box,
  Server,
} from "lucide-react";

interface FeatureItem {
  name: string;
  description: string;
  status: "Implemented" | "Partially Implemented" | "Planned";
}

interface FeatureCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  features: FeatureItem[];
}

export default function FeaturesPage() {
  const categories: FeatureCategory[] = [
    {
      title: "Application Deployment",
      icon: GitBranch,
      features: [
        {
          name: "GitHub Repository Integration",
          description: "Connect GitHub accounts, browse public and private repositories, and pick target branches.",
          status: "Implemented",
        },
        {
          name: "Ephemeral Nixpacks Auto-Detection",
          description: "Detects Node.js, Next.js, Python, Laravel, Go, and static apps in an isolated build sandbox.",
          status: "Implemented",
        },
        {
          name: "Custom Dockerfile Support",
          description: "Prioritizes user-provided Dockerfile for complex multi-stage architectures.",
          status: "Implemented",
        },
        {
          name: "Zero-Downtime Traffic Switch",
          description: "Traefik routes traffic only after container passes HTTP 2xx health check probes.",
          status: "Implemented",
        },
        {
          name: "1-Click Instant Rollback",
          description: "Restores previous container image hash immediately if a release crashes.",
          status: "Partially Implemented",
        },
      ],
    },
    {
      title: "Container & Server Management",
      icon: Server,
      features: [
        {
          name: "Docker Container Lifecycle",
          description: "Inspect, start, stop, restart, and prune containers with direct Docker SDK integration.",
          status: "Implemented",
        },
        {
          name: "Live Resource Monitoring",
          description: "Streaming CPU percent, memory usage, and host storage metrics via Server-Sent Events.",
          status: "Implemented",
        },
        {
          name: "Interactive Web Terminal",
          description: "xterm.js WebSocket terminal directly into running containers from the browser.",
          status: "Implemented",
        },
        {
          name: "Bridge Network Multi-Tenancy",
          description: "Each project is isolated in its own user-defined Docker bridge network.",
          status: "Implemented",
        },
        {
          name: "Multi-VPS Cluster Agent",
          description: "Distributed control plane managing multiple remote Linux VPS hosts from one panel.",
          status: "Planned",
        },
      ],
    },
    {
      title: "Database Provisioning",
      icon: Database,
      features: [
        {
          name: "PostgreSQL 16 Engine",
          description: "Production relational database with isolated internal credentials and persistent volume.",
          status: "Implemented",
        },
        {
          name: "MySQL 8.0 Engine",
          description: "Standard SQL database optimized for WordPress, Laravel, and Node.js applications.",
          status: "Implemented",
        },
        {
          name: "Redis 7.2 In-Memory Cache",
          description: "Fast key-value cache and background worker queue backend.",
          status: "Implemented",
        },
        {
          name: "Auto-Attach & Env Injection",
          description: "Injects complete DATABASE_URL, DB_HOST, DB_PORT, and credentials to attached apps automatically.",
          status: "Implemented",
        },
        {
          name: "Automated S3 Backup Snapshots",
          description: "Scheduled off-site volume backups to Amazon S3 or Cloudflare R2 object storage.",
          status: "Partially Implemented",
        },
      ],
    },
    {
      title: "Domains, Routing & Security",
      icon: Shield,
      features: [
        {
          name: "Magic Staging Domains",
          description: "Generates instant free staging URLs via sslip.io before DNS configuration.",
          status: "Implemented",
        },
        {
          name: "Let's Encrypt SSL Automation",
          description: "Automatic TLS certificate generation and renewal for custom production domains.",
          status: "Implemented",
        },
        {
          name: "AES-256-GCM Secret Encryption",
          description: "All sensitive environment variables and API keys are encrypted at rest with a local master key.",
          status: "Implemented",
        },
        {
          name: "Secure CLI Credential Reset",
          description: "Hidden stdin password reset preventing credentials from leaking in shell history or ps aux.",
          status: "Implemented",
        },
        {
          name: "Private Network & Tailscale Mode",
          description: "Supports unencrypted HTTP access on private 100.x.x.x Tailscale and LAN IPs without certificate errors.",
          status: "Implemented",
        },
      ],
    },
    {
      title: "AI DevOps Assistant",
      icon: Sparkles,
      features: [
        {
          name: "Bring Your Own Key (BYOK)",
          description: "Direct integration with Google Gemini 1.5 Flash and OpenAI GPT-4o Mini with encrypted key storage.",
          status: "Implemented",
        },
        {
          name: "Smart Context Extractor",
          description: "Extracts stderr, initialization lines, and sanitized configuration for precise troubleshooting.",
          status: "Implemented",
        },
        {
          name: "Anti-Bleeding Loop Breaker",
          description: "Caps auto-remediation at 3 attempts per deployment to prevent unbounded token usage.",
          status: "Implemented",
        },
        {
          name: "Interactive Docs AI Assistant",
          description: "Public AI chat assistant answering deployment, database, and VPS configuration questions.",
          status: "Implemented",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen py-12 md:py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
            <Layers className="w-3.5 h-3.5" />
            <span>Capability Ledger</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Features & Capability Matrix
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Everything you need to build, deploy, and manage your applications. All features verified against the actual sPanel codebase.
          </p>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-800">Implemented</span>
            <span className="text-slate-400">: Fully functional in v1.1.0</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-semibold text-slate-800">Partially Implemented</span>
            <span className="text-slate-400">: Core logic active, UI in progress</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span className="font-semibold text-slate-800">Planned</span>
            <span className="text-slate-400">: On roadmap for future releases</span>
          </div>
        </div>

        {/* Feature Categories Tables */}
        <div className="space-y-10">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
              >
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      {cat.title}
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {cat.features.length} capabilities
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {cat.features.map((feat, fIdx) => (
                    <div
                      key={fIdx}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="space-y-1 max-w-2xl">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {feat.name}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {feat.description}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {feat.status === "Implemented" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Implemented</span>
                          </span>
                        )}
                        {feat.status === "Partially Implemented" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Partially Implemented</span>
                          </span>
                        )}
                        {feat.status === "Planned" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>Planned</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Card */}
        <div className="p-8 rounded-2xl bg-indigo-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold">Ready to deploy your applications?</h3>
            <p className="text-xs text-indigo-200">
              Install sPanel on your server in under 5 minutes with genuine Docker-native execution.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/installation/"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-indigo-950 bg-white hover:bg-indigo-50 transition shadow-xs"
            >
              Install sPanel
            </Link>
            <Link
              href="/docs/"
              className="px-5 py-2.5 rounded-xl text-xs font-medium text-white border border-indigo-700 hover:bg-indigo-800 transition"
            >
              Read Documentation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
