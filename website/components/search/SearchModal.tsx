"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, BookOpen, Terminal, Layers, ArrowRight, FileText } from "lucide-react";

interface SearchResult {
  title: string;
  category: string;
  href: string;
  summary: string;
}

const SEARCH_DATABASE: SearchResult[] = [
  {
    title: "Installation Guide",
    category: "Getting Started",
    href: "/installation/",
    summary: "System requirements, pre-built binary installation, and systemd service setup.",
  },
  {
    title: "System Requirements",
    category: "Getting Started",
    href: "/installation/#requirements",
    summary: "Ubuntu 22.04 LTS / Debian 12, Docker 20.10+, 2GB RAM, 20GB disk.",
  },
  {
    title: "GitHub Integration",
    category: "User Guide",
    href: "/docs/deployment/",
    summary: "Connect GitHub repositories, select branches, and configure auto-deploy.",
  },
  {
    title: "Framework Detection",
    category: "User Guide",
    href: "/docs/deployment/#frameworks",
    summary: "Ephemeral Nixpacks auto-detection for Next.js, Node.js, Laravel, Python, Go.",
  },
  {
    title: "Database Management",
    category: "User Guide",
    href: "/docs/#databases",
    summary: "Provision PostgreSQL, MySQL, Redis, and SQLite with persistent host volumes.",
  },
  {
    title: "Environment Variables",
    category: "User Guide",
    href: "/docs/#env-vars",
    summary: "Build-time vs runtime variables and AES-256-GCM secret encryption.",
  },
  {
    title: "Domains & HTTPS",
    category: "User Guide",
    href: "/docs/#domains",
    summary: "Magic staging domains with sslip.io and automatic Let's Encrypt SSL.",
  },
  {
    title: "Features Matrix",
    category: "Product",
    href: "/features/",
    summary: "Complete breakdown of implemented, partially implemented, and planned features.",
  },
  {
    title: "Changelog",
    category: "Project",
    href: "/changelog/",
    summary: "Release history and git commits for sPanel v1.1.0.",
  },
  {
    title: "Roadmap",
    category: "Project",
    href: "/roadmap/",
    summary: "Shipped milestones, active in-progress tasks, and future multi-VPS clustering.",
  },
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = query.trim()
    ? SEARCH_DATABASE.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.summary.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : SEARCH_DATABASE.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation, guides, and features..."
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden bg-transparent"
          />
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200">
            Esc
          </kbd>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 max-h-80 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No results found for &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                onClick={onClose}
                className="flex items-start justify-between p-3 rounded-xl hover:bg-slate-50 transition group cursor-pointer"
              >
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {item.summary}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0 mt-1" />
              </Link>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Search sPanel Documentation Portal</span>
          <span className="font-mono text-[10px]">v1.1.0</span>
        </div>
      </div>
    </div>
  );
};
