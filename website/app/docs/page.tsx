import React from "react";
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
  Shield,
  Search,
  ExternalLink,
  HelpCircle,
  FileCode,
  CheckCircle2,
} from "lucide-react";

interface SidebarNavItem {
  title: string;
  href: string;
  active?: boolean;
  external?: boolean;
}

interface SidebarNavCategory {
  category: string;
  items: SidebarNavItem[];
}

export default function DocsPortalPage() {
  const sidebarNav: SidebarNavCategory[] = [
    {
      category: "Getting Started",
      items: [
        { title: "Overview", href: "/docs/", active: true },
        { title: "System Requirements", href: "/installation/#requirements" },
        { title: "Installation", href: "/installation/" },
        { title: "Initial Setup", href: "/installation/#systemd" },
      ],
    },
    {
      category: "User Guide",
      items: [
        { title: "Applications", href: "/docs/deployment/" },
        { title: "Deployments", href: "/docs/deployment/" },
        { title: "Environment Variables", href: "#env-vars" },
        { title: "Databases", href: "#databases" },
        { title: "Domains & HTTPS", href: "#domains" },
        { title: "Monitoring", href: "#monitoring" },
        { title: "Logs & Terminal", href: "#terminal" },
      ],
    },
    {
      category: "Operations",
      items: [
        { title: "Backup & Restore", href: "#backups" },
        { title: "Upgrading", href: "#upgrading" },
        { title: "Troubleshooting", href: "#troubleshooting" },
      ],
    },
    {
      category: "Developer Guide",
      items: [
        { title: "Architecture", href: "#architecture" },
        { title: "API Reference", href: "#api" },
        { title: "Contributing", href: "https://github.com/azka13labib-ops/Spanel/blob/main/CONTRIBUTING.md", external: true },
      ],
    },
  ];

  const quickLinks = [
    {
      title: "Installation Guide",
      description: "Get sPanel up and running on your Linux VPS server.",
      href: "/installation/",
      icon: Terminal,
    },
    {
      title: "Deploying an Application",
      description: "Learn how to deploy from GitHub and configure your stack.",
      href: "/docs/deployment/",
      icon: Layers,
    },
    {
      title: "Database Management",
      description: "Provision and manage databases like PostgreSQL, MySQL, Redis.",
      href: "#databases",
      icon: Database,
    },
    {
      title: "Environment Variables",
      description: "Configure build-time and runtime environment variables.",
      href: "#env-vars",
      icon: KeyRound,
    },
  ];

  const popularGuides = [
    {
      title: "Getting Started",
      description: "Complete setup from installation to your first deployment.",
      href: "/installation/",
    },
    {
      title: "Deploying a Laravel Application",
      description: "Step-by-step guide for Laravel with MySQL database and background queue.",
      href: "/docs/deployment/#laravel",
    },
    {
      title: "Deploying a Next.js Application",
      description: "Configure Next.js with static export or standalone Node.js server.",
      href: "/docs/deployment/#nextjs",
    },
    {
      title: "Domains and HTTPS",
      description: "Set up custom production domains and automated Let's Encrypt SSL certificates.",
      href: "#domains",
    },
    {
      title: "Backup and Restore",
      description: "Protect your application data with automated persistent volume backups.",
      href: "#backups",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar Navigation */}
        <aside className="w-full lg:w-64 shrink-0 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Documentation</span>
            </div>

            <div className="space-y-5">
              {sidebarNav.map((sec, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {sec.category}
                  </h4>
                  <ul className="space-y-1">
                    {sec.items.map((item, iIdx) => (
                      <li key={iIdx}>
                        <Link
                          href={item.href}
                          target={item.external ? "_blank" : undefined}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                            item.active
                              ? "bg-indigo-50 text-indigo-700 font-semibold"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                        >
                          <span>{item.title}</span>
                          {item.external && <ExternalLink className="w-3 h-3 text-slate-400" />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Need help card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h5 className="text-xs font-bold text-slate-900">Need help?</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Join our community or open an issue on GitHub.
              </p>
              <a
                href="https://github.com/azka13labib-ops/Spanel/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <span>GitHub Issues</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </aside>

        {/* Main Reading Column */}
        <div className="flex-1 min-w-0 space-y-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <span>Documentation</span>
            <span>&gt;</span>
            <span className="text-slate-900 font-semibold">Overview</span>
          </nav>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              sPanel Documentation
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              Everything you need to know to deploy, manage, and scale your applications with sPanel. Choose a section from the sidebar or search for specific topics.
            </p>
          </div>

          {/* What is sPanel Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-base font-bold text-slate-900">
                What is sPanel?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                sPanel is a self-hosted PaaS that helps you deploy and manage applications on your own VPS infrastructure. It provides a modern, intuitive interface for handling your infrastructure, databases, and deployments with Docker-based isolation.
              </p>
              <Link
                href="/docs/deployment/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 pt-1"
              >
                <span>Learn more about deployment workflows</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Links Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Quick Links
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickLinks.map((link, idx) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={idx}
                    href={link.href}
                    className="p-5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition group cursor-pointer space-y-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {link.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Popular Guides Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Popular Guides
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {popularGuides.map((guide, idx) => (
                <Link
                  key={idx}
                  href={guide.href}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                      {guide.title}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {guide.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Still have questions banner */}
          <div className="p-6 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white text-indigo-600 flex items-center justify-center border border-slate-200 shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Still have questions?</h4>
                <p className="text-[11px] text-slate-500">
                  Join our community discussions or report an issue on GitHub.
                </p>
              </div>
            </div>
            <a
              href="https://github.com/azka13labib-ops/Spanel/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs shrink-0"
            >
              Open Discussions
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
