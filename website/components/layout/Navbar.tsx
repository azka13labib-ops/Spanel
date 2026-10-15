"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  BookOpen,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { SearchModal } from "@/components/search/SearchModal";
import { useLanguage } from "@/context/LanguageContext";
import { Logo } from "@/components/brand/Logo";

interface NavbarProps {
  activePath?: string;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activePath, onOpenSearch }) => {
  const pathname = usePathname();
  const currentPath = activePath ?? pathname;
  const { locale, setLocale, t } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);


  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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
      if (e.key === "Escape") {
        setLangMenuOpen(false);
        setMobileMenuOpen(false);
      }
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
            <Logo className="h-9 w-9 rounded-xl" size={36} priority />
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
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Icon Trigger (min-h-11 touch target) */}
          <button
            onClick={handleOpenSearch}
            className="sm:hidden min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Search documentation"
          >
            <Search className="w-4.5 h-4.5 text-slate-500" />
          </button>

          {/* Desktop Quick Search Trigger */}
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
              className="min-h-11 sm:min-h-0 flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                  className={`w-full min-h-10 flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
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
                  className={`w-full min-h-10 flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
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
            className="min-h-10 sm:min-h-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow transition active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-200" />
            <span className="hidden xs:inline">{t("nav.install_btn")}</span>
            <span className="xs:hidden">Install</span>
          </Link>

          {/* Mobile Menu Toggle (44x44px touch target) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 md:hidden cursor-pointer transition"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Off-canvas Mobile Drawer and Backdrop via Portal to body */}
      {mounted &&
        createPortal(
          <>
            {/* Backdrop Overlay with Blur */}
            <div
              className={`fixed inset-0 z-9998 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300 md:hidden ${
                mobileMenuOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Mobile Drawer sliding from the right with blur */}
            <aside
              className={`fixed inset-y-0 right-0 z-9999 h-dvh w-72 sm:w-80 max-w-[85vw] bg-white/95 backdrop-blur-md shadow-2xl border-l border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out md:hidden ${
                mobileMenuOpen ? "translate-x-0" : "translate-x-full"
              }`}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation Menu"
            >
              {/* Drawer Header with Official Logo */}
              <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between bg-white/50 shrink-0">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <Logo className="h-8 w-8 rounded-xl" size={32} />
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-base tracking-tight text-slate-900">
                      sPanel
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
                      v1.1.0
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Nav Content */}
              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                    Navigation
                  </div>
                  {navLinks.map((link) => {
                    const isActive = isLinkActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700 font-semibold"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <span>{link.label}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        )}
                      </Link>
                    );
                  })}
                  <a
                    href="https://github.com/azka13labib-ops/Spanel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <GithubIcon className="w-4 h-4 text-slate-500" />
                      <span>{t("nav.github")}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">↗</span>
                  </a>
                </div>

                {/* Quick Language Toggle in Mobile Drawer */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Language</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLocale("en")}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                        locale === "en"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>English</span>
                      {locale === "en" && (
                        <Check className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocale("id")}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                        locale === "id"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>Indonesia</span>
                      {locale === "id" && (
                        <Check className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="p-5 border-t border-slate-100 bg-slate-50/70 space-y-2.5 shrink-0">
                <Link
                  href="/installation/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition active:scale-98"
                >
                  <Terminal className="w-4 h-4 text-indigo-200" />
                  <span>{t("nav.install_btn")}</span>
                </Link>
                <Link
                  href="/docs/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
                >
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <span>{t("nav.docs")}</span>
                </Link>
              </div>
            </aside>
          </>,
          document.body
        )}



      {/* Quick Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </header>
  );
};
