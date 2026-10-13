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
  Database,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Code2,
  Network,
  Cpu,
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
          title: t("docs.sidebar.quickstart"),
          href: "/docs/quickstart/",
          icon: Rocket,
        },
        {
          title: t("docs.sidebar.architecture"),
          href: "/docs/#architecture",
          icon: Compass,
        },
        {
          title: t("docs.sidebar.systemd"),
          href: "/docs/#systemd",
          icon: Server,
        },
      ],
    },
    {
      group: t("docs.sidebar.deploy_apps"),
      items: [
        {
          title: t("docs.sidebar.frameworks"),
          href: "/docs/deployment/",
          icon: FileCode2,
        },
        {
          title: t("docs.sidebar.github"),
          href: "/docs/deployment/#github",
          icon: Rocket,
        },
        {
          title: t("docs.sidebar.laravel"),
          href: "/docs/deployment/#laravel",
          icon: Layers,
        },
        {
          title: t("docs.sidebar.nextjs"),
          href: "/docs/deployment/#nextjs",
          icon: Layers,
        },
        {
          title: t("docs.sidebar.python"),
          href: "/docs/deployment/#python",
          icon: Code2,
        },
        {
          title: t("docs.sidebar.docker"),
          href: "/docs/deployment/#docker",
          icon: Server,
        },
        {
          title: t("docs.sidebar.env_vars"),
          href: "/docs/deployment/#env",
          icon: KeyRound,
        },
      ],
    },
    {
      group: t("docs.sidebar.database_storage"),
      items: [
        {
          title: t("docs.sidebar.databases"),
          href: "/docs/databases/",
          icon: Database,
        },
        {
          title: t("docs.sidebar.postgres"),
          href: "/docs/databases/#postgres",
          icon: Layers,
        },
        {
          title: t("docs.sidebar.mysql"),
          href: "/docs/databases/#mysql",
          icon: Layers,
        },
        {
          title: t("docs.sidebar.redis"),
          href: "/docs/databases/#redis",
          icon: Layers,
        },
        {
          title: t("docs.sidebar.internal_network"),
          href: "/docs/databases/#networking",
          icon: Network,
        },
        {
          title: t("docs.sidebar.volumes"),
          href: "/docs/databases/#volumes",
          icon: Archive,
        },
      ],
    },
    {
      group: t("docs.sidebar.domains_security"),
      items: [
        {
          title: t("docs.sidebar.domains"),
          href: "/docs/domains-ssl/",
          icon: Globe,
        },
        {
          title: t("docs.sidebar.traefik_ssl"),
          href: "/docs/domains-ssl/#ssl",
          icon: ShieldCheck,
        },
        {
          title: t("docs.sidebar.cloudflare"),
          href: "/docs/domains-ssl/#cloudflare",
          icon: ShieldCheck,
        },
        {
          title: t("docs.sidebar.staging_domains"),
          href: "/docs/domains-ssl/#staging",
          icon: Globe,
        },
      ],
    },
    {
      group: t("docs.sidebar.manage_server"),
      items: [
        {
          title: t("docs.sidebar.server_mgmt"),
          href: "/docs/server-management/",
          icon: Server,
        },
        {
          title: t("docs.sidebar.live_logs"),
          href: "/docs/server-management/#logs",
          icon: Activity,
        },
        {
          title: t("docs.sidebar.terminal"),
          href: "/docs/server-management/#terminal",
          icon: Terminal,
        },
        {
          title: t("docs.sidebar.rollback"),
          href: "/docs/server-management/#rollback",
          icon: RotateCcw,
        },
      ],
    },
    {
      group: t("docs.sidebar.troubleshoot_group"),
      items: [
        {
          title: t("docs.sidebar.troubleshooting"),
          href: "/docs/troubleshooting/",
          icon: LifeBuoy,
        },
        {
          title: t("docs.sidebar.git_timeout"),
          href: "/docs/troubleshooting/#git-timeout",
          icon: AlertTriangle,
        },
        {
          title: t("docs.sidebar.bad_gateway"),
          href: "/docs/troubleshooting/#502",
          icon: AlertTriangle,
        },
        {
          title: t("docs.sidebar.oom_swap"),
          href: "/docs/troubleshooting/#swap",
          icon: Cpu,
        },
      ],
    },
    {
      group: t("docs.sidebar.reference"),
      items: [
        {
          title: t("docs.sidebar.contributing"),
          href: "https://github.com/azka13labib-ops/Spanel/blob/main/CONTRIBUTING.md",
          icon: GitPullRequest,
          external: true,
        },
        {
          title: "GitHub Repository",
          href: "https://github.com/azka13labib-ops/Spanel",
          icon: ExternalLink,
          external: true,
        },
      ],
    },
  ];

  const isItemActive = (href: string) => {
    if (!pathname) return false;
    const cleanCurrent = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
    const baseHref = href.split("#")[0];
    const cleanHref = baseHref.endsWith("/") ? baseHref.slice(0, -1) : baseHref;

    if (href.includes("#")) {
      return false;
    }
    return cleanCurrent === cleanHref;
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
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider sticky top-0 bg-white z-10">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>{t("docs.breadcrumb_root")}</span>
          </div>

          {renderNavList()}
        </div>
      </aside>
    </>
  );
};
