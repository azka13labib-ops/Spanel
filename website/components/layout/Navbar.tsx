"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  Menu,
  X,
  ArrowRight,
  BookOpen,
  Terminal,
  Sparkles,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { SearchModal } from "@/components/search/SearchModal";

interface NavbarProps {
  activePath?: string;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activePath = "/", onOpenSearch }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const handleOpenSearch = () => {
    if (onOpenSearch) onOpenSearch();
    else setSearchModalOpen(true);
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/features/" },
    { label: "Documentation", href: "/docs/" },
    { label: "Installation", href: "/installation/" },
    { label: "Changelog", href: "/changelog/" },
    { label: "Roadmap", href: "/roadmap/" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-slate-900">
                  sPanel
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
                  v1.1.0
                </span>
              </div>
              <span className="text-[10px] text-slate-500 -mt-0.5 hidden sm:block">
                Smart PaaS Panel
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const isActive = activePath === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    isActive
                      ? "text-indigo-600 font-semibold bg-indigo-50/70"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <a
              href="https://github.com/azka13labib-ops/Spanel"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition flex items-center gap-1.5"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </nav>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Search Trigger */}
          <button
            onClick={handleOpenSearch}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 text-xs text-slate-400 hover:text-slate-600 hover:bg-white hover:border-slate-300 transition cursor-pointer"
            title="Search documentation (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search...</span>
            <kbd className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200">
              Ctrl K
            </kbd>
          </button>

          {/* Primary CTA: Install sPanel */}
          <Link
            href="/installation/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow transition active:scale-95 cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-200" />
            <span>Install sPanel</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-xs font-medium ${
                  activePath === link.href
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/azka13labib-ops/Spanel"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <GithubIcon className="w-4 h-4 text-slate-500" />
              <span>GitHub Repository</span>
            </a>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/installation/"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
            >
              Install sPanel
            </Link>
            <Link
              href="/docs/"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center px-4 py-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              Read Documentation
            </Link>
          </div>
        </div>
      )}

      {/* Quick Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </header>
  );
};
