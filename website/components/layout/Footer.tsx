import React from "react";
import Link from "next/link";
import { Layers, BookOpen, Terminal, Shield, GitCommit, FileText } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4 pr-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <span className="font-bold text-base text-white tracking-tight">
                sPanel
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                v1.1.0
              </span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Lightweight, self-hosted Platform as a Service (PaaS) for deploying and managing applications on your own Linux VPS with Docker-based execution and Go single-binary architecture.
            </p>
            <div className="flex items-center gap-3 pt-2 text-slate-400">
              <a
                href="https://github.com/azka13labib-ops/Spanel"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition flex items-center gap-1.5"
              >
                <GithubIcon className="w-4 h-4" />
                <span>GitHub Repository</span>
              </a>
              <span>•</span>
              <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                MIT License
              </span>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/installation/" className="hover:text-white transition">
                  Installation Guide
                </Link>
              </li>
              <li>
                <Link href="/features/" className="hover:text-white transition">
                  Features & Status
                </Link>
              </li>
              <li>
                <Link href="/docs/" className="hover:text-white transition">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/changelog/" className="hover:text-white transition">
                  Changelog
                </Link>
              </li>
              <li>
                <Link href="/roadmap/" className="hover:text-white transition">
                  Project Roadmap
                </Link>
              </li>
            </ul>
          </div>

          {/* Documentation Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              User Guides
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/docs/#getting-started" className="hover:text-white transition">
                  System Requirements
                </Link>
              </li>
              <li>
                <Link href="/docs/#deployments" className="hover:text-white transition">
                  GitHub Deployment
                </Link>
              </li>
              <li>
                <Link href="/docs/#databases" className="hover:text-white transition">
                  PostgreSQL & MySQL
                </Link>
              </li>
              <li>
                <Link href="/docs/#env-vars" className="hover:text-white transition">
                  Environment Variables
                </Link>
              </li>
              <li>
                <Link href="/docs/#server-ops" className="hover:text-white transition">
                  Tailscale & SSL Setup
                </Link>
              </li>
            </ul>
          </div>

          {/* Community & Legal Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Community & Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/azka13labib-ops/Spanel/blob/main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  Contributing
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/azka13labib-ops/Spanel/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  Issue Tracker
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/azka13labib-ops/Spanel/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  Security Disclosure
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/azka13labib-ops/Spanel/blob/main/README.md#lisensi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  MIT License
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <p>© 2026 sPanel Contributors. Free and open-source under the MIT License.</p>
          <div className="flex items-center gap-4">
            <Link href="/installation/" className="hover:text-slate-300 transition">
              Install sPanel
            </Link>
            <span>•</span>
            <Link href="/docs/" className="hover:text-slate-300 transition">
              Docs Portal
            </Link>
            <span>•</span>
            <a
              href="https://github.com/azka13labib-ops/Spanel"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
