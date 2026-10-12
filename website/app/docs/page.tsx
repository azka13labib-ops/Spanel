"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Terminal,
  Layers,
  Database,
  KeyRound,
  ArrowRight,
  Globe,
  Server,
  Activity,
  Archive,
  Compass,
  FileCode2,
  LifeBuoy,
  GitPullRequest,
  Search,
  ExternalLink,
  HelpCircle,
  Package,
  Rocket,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { SearchModal } from "@/components/search/SearchModal";
import { useLanguage } from "@/context/LanguageContext";

interface SidebarNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  external?: boolean;
}

interface SidebarNavGroup {
  group: string;
  items: SidebarNavItem[];
}

export default function DocsPortalPage() {
  const { t } = useLanguage();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const sidebarNav: SidebarNavGroup[] = [
    {
      group: t("docs.sidebar.start_here"),
      items: [
        {
          title: t("docs.sidebar.overview"),
          href: "/docs/",
          icon: BookOpen,
          active: true,
        },
        {
          title: t("docs.sidebar.requirements"),
          href: "/installation/#requirements",
          icon: Server,
        },
        {
          title: t("docs.sidebar.installation"),
          href: "/installation/",
          icon: Terminal,
        },
        {
          title: t("docs.sidebar.first_setup"),
          href: "/installation/",
          icon: CheckCircle2,
        },
      ],
    },
    {
      group: t("docs.sidebar.deploy_apps"),
      items: [
        {
          title: t("docs.sidebar.github"),
          href: "/docs/deployment/",
          icon: Rocket,
        },
        {
          title: t("docs.sidebar.laravel"),
          href: "/docs/deployment/",
          icon: Layers,
        },
        {
          title: t("docs.sidebar.nextjs"),
          href: "/docs/deployment/",
          icon: Layers,
        },
        {
          title: t("docs.sidebar.env_vars"),
          href: "/features/",
          icon: KeyRound,
        },
        {
          title: t("docs.sidebar.domains"),
          href: "/features/",
          icon: Globe,
        },
      ],
    },
    {
      group: t("docs.sidebar.manage_server"),
      items: [
        {
          title: t("docs.sidebar.containers"),
          href: "/features/",
          icon: Package,
        },
        {
          title: t("docs.sidebar.databases"),
          href: "/features/",
          icon: Database,
        },
        {
          title: t("docs.sidebar.terminal"),
          href: "/features/",
          icon: Terminal,
        },
        {
          title: t("docs.sidebar.monitoring"),
          href: "/features/",
          icon: Activity,
        },
        {
          title: t("docs.sidebar.backups"),
          href: "/roadmap/",
          icon: Archive,
        },
      ],
    },
    {
      group: t("docs.sidebar.reference"),
      items: [
        {
          title: t("docs.sidebar.architecture"),
          href: "/features/",
          icon: Compass,
        },
        {
          title: t("docs.sidebar.api_ref"),
          href: "/features/",
          icon: FileCode2,
        },
        {
          title: t("docs.sidebar.troubleshooting"),
          href: "https://github.com/azka13labib-ops/Spanel/issues",
          icon: LifeBuoy,
          external: true,
        },
        {
          title: t("docs.sidebar.contributing"),
          href: "https://github.com/azka13labib-ops/Spanel/blob/main/CONTRIBUTING.md",
          icon: GitPullRequest,
          external: true,
        },
      ],
    },
  ];

  const gettingStartedCards = [
    {
      title: t("docs.card.install.title"),
      description: t("docs.card.install.desc"),
      href: "/installation/",
      icon: Package,
    },
    {
      title: t("docs.card.deploy.title"),
      description: t("docs.card.deploy.desc"),
      href: "/docs/deployment/",
      icon: Rocket,
    },
    {
      title: t("docs.card.db.title"),
      description: t("docs.card.db.desc"),
      href: "/features/",
      icon: Database,
    },
  ];

  const popularGuides = [
    {
      title: t("docs.guide1_title"),
      description: t("docs.guide1_desc"),
      href: "/docs/deployment/",
      icon: Rocket,
    },
    {
      title: t("docs.guide2_title"),
      description: t("docs.guide2_desc"),
      href: "/features/",
      icon: KeyRound,
    },
    {
      title: t("docs.guide3_title"),
      description: t("docs.guide3_desc"),
      href: "/features/",
      icon: Globe,
    },
    {
      title: t("docs.guide4_title"),
      description: t("docs.guide4_desc"),
      href: "/roadmap/",
      icon: Archive,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col lg:flex-row gap-8 lg:gap-10">
        {/* Mobile Documentation Navigation Toggle */}
        <div className="lg:hidden w-full">
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-2xs text-left"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>{t("docs.menu_title")}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>{mobileNavOpen ? t("docs.menu_hide") : t("docs.menu_show")}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileNavOpen ? "rotate-180 text-indigo-600" : "text-slate-400"}`} />
            </div>
          </button>
        </div>

        {/* Left Documentation Sidebar (Exact match to Mockup Right Screen) */}
        <aside className={`w-full lg:w-64 shrink-0 space-y-6 ${mobileNavOpen ? "block" : "hidden lg:block"}`}>
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>{t("docs.breadcrumb_root")}</span>
            </div>

            <div className="space-y-6">
              {sidebarNav.map((group, gIdx) => (
                <div key={gIdx} className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2.5">
                    {group.group}
                  </h3>
                  <ul className="space-y-0.5">
                    {group.items.map((item, iIdx) => {
                      const Icon = item.icon;
                      return (
                        <li key={iIdx}>
                          <Link
                            href={item.href}
                            target={item.external ? "_blank" : undefined}
                            rel={item.external ? "noopener noreferrer" : undefined}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                              item.active
                                ? "bg-indigo-50 text-indigo-700 font-semibold"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                              <span>{item.title}</span>
                            </span>
                            {item.external && (
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Documentation Reading Area */}
        <div className="flex-1 min-w-0 space-y-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>{t("docs.breadcrumb_root")}</span>
            <span>&gt;</span>
            <span className="text-slate-900 font-semibold">
              {t("docs.breadcrumb_overview")}
            </span>
          </nav>

          {/* Hero Heading */}
          <div className="space-y-2.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {t("docs.hero_title")}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              {t("docs.hero_subtitle")}
            </p>
          </div>

          {/* Quick Search Field Bar (Matches Mockup) */}
          <div
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition cursor-pointer group"
          >
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              <span className="group-hover:text-slate-600 transition-colors">
                {t("docs.search_placeholder")}
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-500 border border-slate-200">
              Ctrl K
            </kbd>
          </div>

          {/* Getting Started Section (3 Large Cards) */}
          <div className="space-y-4 pt-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {t("docs.getting_started.title")}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {t("docs.getting_started.subtitle")}
              </p>
            </div>

            <div className="space-y-3">
              {gettingStartedCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={idx}
                    href={card.href}
                    className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-300 hover:shadow-sm transition-all flex items-center justify-between gap-4 group cursor-pointer"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Popular Guides Section */}
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {t("docs.popular.title")}
            </h2>

            <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {popularGuides.map((guide, idx) => {
                const Icon = guide.icon;
                return (
                  <Link
                    key={idx}
                    href={guide.href}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {guide.title}
                        </h4>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {guide.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Still Stuck? Callout Card (Exact Match to Mockup) */}
          <div className="p-6 sm:p-7 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {t("docs.stuck.title")}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                  {t("docs.stuck.desc")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href="https://github.com/azka13labib-ops/Spanel/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs"
              >
                {t("docs.stuck.btn_troubleshoot")}
              </a>
              <a
                href="https://github.com/azka13labib-ops/Spanel"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs"
              >
                <GithubIcon className="w-3.5 h-3.5" />
                <span>{t("docs.stuck.btn_github")}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Global Documentation Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </div>
  );
}
