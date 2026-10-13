"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Terminal,
  Layers,
  KeyRound,
  Globe,
  Server,
  Activity,
  Archive,
  Compass,
  FileCode2,
  LifeBuoy,
  GitPullRequest,
  ExternalLink,
  Rocket,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface SidebarNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

interface SidebarNavGroup {
  group: string;
  items: SidebarNavItem[];
}

export const DocsSidebar: React.FC = () => {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [mobileDocsNavOpen, setMobileDocsNavOpen] = useState(false);

  const sidebarNav: SidebarNavGroup[] = [
    {
      group: t("docs.sidebar.start_here"),
      items: [
        {
          title: t("docs.sidebar.overview"),
          href: "/docs/",
          icon: BookOpen,
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
          icon: Layers,
        },
        {
          title: t("docs.sidebar.databases"),
          href: "/features/",
          icon: Layers,
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

  const isItemActive = (href: string) => {
    if (!pathname) return false;
    const cleanCurrent = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
    const cleanHref = href.endsWith("/") ? href.slice(0, -1) : href;

    if (cleanHref === "/docs") {
      return cleanCurrent === "/docs";
    }
    if (cleanHref === "/docs/deployment") {
      return cleanCurrent.startsWith("/docs/deployment");
    }
    return false;
  };

  const renderNavList = () => (
    <div className="space-y-6">
      {sidebarNav.map((group, gIdx) => (
        <div key={gIdx} className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2.5">
            {group.group}
          </h3>
          <ul className="space-y-0.5">
            {group.items.map((item, iIdx) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);
              return (
                <li key={iIdx}>
                  <Link
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    onClick={() => setMobileDocsNavOpen(false)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      active
                        ? "bg-indigo-50 text-indigo-700 font-semibold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${active ? "text-indigo-600" : "text-slate-400"}`} />
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
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden w-full mb-6">
        <button
          type="button"
          onClick={() => setMobileDocsNavOpen(!mobileDocsNavOpen)}
          className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-2xs text-left"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>{t("docs.menu_title")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>{mobileDocsNavOpen ? t("docs.menu_hide") : t("docs.menu_show")}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                mobileDocsNavOpen ? "rotate-180 text-indigo-600" : "text-slate-400"
              }`}
            />
          </div>
        </button>

        {mobileDocsNavOpen && (
          <div className="mt-2.5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-in fade-in-50 duration-150">
            {renderNavList()}
          </div>
        )}
      </div>

      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>{t("docs.breadcrumb_root")}</span>
          </div>

          {renderNavList()}
        </div>
      </aside>
    </>
  );
};
