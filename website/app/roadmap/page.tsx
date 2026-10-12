import React from "react";
import Link from "next/link";
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  Server,
  Database,
  Shield,
  Box,
} from "lucide-react";

export default function RoadmapPage() {
  const sections = [
    {
      stage: "Shipped & Available (v1.1.0)",
      description: "Core PaaS features verified and operational in current production releases.",
      badge: "Completed",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      items: [
        {
          title: "Single-Binary Architecture",
          desc: "Go Fiber backend embedding Next.js static assets with zero Node.js host requirement.",
        },
        {
          title: "Ephemeral Nixpacks Builder",
          desc: "Sandbox container build pipeline supporting Node.js, Python, Laravel, Go, and static sites.",
        },
        {
          title: "Database Provisioning & Auto-Attach",
          desc: "PostgreSQL 16, MySQL 8, Redis 7, and SQLite with automatic environment variable injection.",
        },
        {
          title: "Zero-Downtime Routing & Let's Encrypt SSL",
          desc: "Dynamic Traefik reverse proxy with health check probe verification before traffic cutover.",
        },
        {
          title: "AES-256-GCM Secret Encryption",
          desc: "Symmetric encryption for environment variables, API tokens, and credentials.",
        },
        {
          title: "Interactive Web Terminal",
          desc: "xterm.js browser shell directly into running application containers.",
        },
        {
          title: "Documentation Portal & Ask AI Assistant",
          desc: "Categorized guides, copyable code blocks, and AI chat assistant.",
        },
      ],
    },
    {
      stage: "In Active Development (v1.2.0)",
      description: "Features currently being implemented and tested for upcoming minor releases.",
      badge: "In Progress",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      items: [
        {
          title: "Automated Off-Site S3 Volume Backups",
          desc: "Scheduled snapshot backups to Amazon S3, Cloudflare R2, or custom S3-compatible endpoints.",
        },
        {
          title: "1-Click Instant Image Hash Rollback",
          desc: "Full UI integration for instant zero-rebuild recovery to previously deployed image hashes.",
        },
        {
          title: "Custom Healthcheck Probes",
          desc: "Configurable HTTP path, expected status codes, probe intervals, and timeout thresholds.",
        },
      ],
    },
    {
      stage: "Future Roadmap (v2.0 Architecture)",
      description: "Planned major capabilities designed for multi-server infrastructure scale.",
      badge: "Planned",
      badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
      items: [
        {
          title: "Multi-VPS Cluster Agent",
          desc: "Manage multiple remote Linux VPS hosts from one centralized sPanel control plane.",
        },
        {
          title: "Team Collaboration & RBAC",
          desc: "Role-based access permissions, team invites, and audit logs for multiple administrators.",
        },
        {
          title: "1-Click Open-Source Marketplace",
          desc: "Pre-configured templates for WordPress, Ghost, Directus, Supabase, and Meilisearch.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 border-b border-slate-200 py-12 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-mono">
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>Product Direction</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Project Roadmap
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Our transparent product roadmap. We distinguish verified current capabilities from future goals.
          </p>
        </div>

        {/* Roadmap Stages */}
        <div className="space-y-10">
          {sections.map((sec, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {sec.stage}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sec.description}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold font-mono border self-start sm:self-center ${sec.badgeColor}`}
                >
                  {sec.badge}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sec.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1.5"
                  >
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      <span>{item.title}</span>
                    </h3>
                    <p className="text-[11px] text-slate-600 leading-relaxed pl-3.5">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contribute card */}
        <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-sm font-bold text-slate-900">Want to propose a feature?</h3>
            <p className="text-xs text-slate-600">
              Join discussions or submit a pull request on our official GitHub repository.
            </p>
          </div>
          <a
            href="https://github.com/azka13labib-ops/Spanel/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shrink-0 shadow-xs"
          >
            <span>Open Discussion</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
