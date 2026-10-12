"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Search,
  Menu,
  X,
  Terminal,
  Globe,
  ChevronDown,
  Check,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { SearchModal } from "@/components/search/SearchModal";
import { useLanguage } from "@/context/LanguageContext";

interface NavbarProps {
  activePath?: string;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activePath, onOpenSearch }) => {
  const pathname = usePathname();
  const currentPath = activePath ?? pathname;
  const { locale, setLocale, t } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(e.target as Node)
      ) {
        setLangMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLangMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleOpenSearch = () => {
    if (onOpenSearch) onOpenSearch();
    else setSearchModalOpen(true);
  };

  const navLinks = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.features"), href: "/features/" },
    { label: t("nav.docs"), href: "/docs/" },
    { label: t("nav.installation"), href: "/installation/" },
    { label: t("nav.changelog"), href: "/changelog/" },
    { label: t("nav.roadmap"), href: "/roadmap/" },
  ];

  const isLinkActive = (href: string) => {
    if (!currentPath) return false;
    if (href === "/") return currentPath === "/";
    const cleanHref = href.endsWith("/") ? href.slice(0, -1) : href;
    const cleanCurrent = currentPath.endsWith("/")
      ? currentPath.slice(0, -1)
      : currentPath;
    return (
      cleanCurrent === cleanHref || cleanCurrent.startsWith(cleanHref + "/")
    );
  };

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
              const isActive = isLinkActive(link.href);
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
              <span>{t("nav.github")}</span>
            </a>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Search Trigger */}
          <button
            onClick={handleOpenSearch}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 text-xs text-slate-400 hover:text-slate-600 hover:bg-white hover:border-slate-300 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Search documentation (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>{t("nav.search_placeholder")}</span>
            <kbd className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200">
              Ctrl K
            </kbd>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Select language"
              aria-expanded={langMenuOpen}
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">
                {locale === "en" ? "English" : "Indonesia"}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-white border border-slate-200 shadow-md p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setLocale("en");
                    setLangMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    locale === "en"
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>English</span>
                  {locale === "en" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
                <button
                  onClick={() => {
                    setLocale("id");
                    setLangMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    locale === "id"
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>Indonesia</span>
                  {locale === "id" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Primary CTA: Install sPanel */}
          <Link
            href="/installation/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow transition active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-200" />
            <span>{t("nav.install_btn")}</span>
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
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-xs font-medium ${
                  isLinkActive(link.href)
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
              <span>{t("nav.github")}</span>
            </a>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/installation/"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
            >
              {t("nav.install_btn")}
            </Link>
            <Link
              href="/docs/"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center px-4 py-2.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              {t("nav.docs")}
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
