"use client";

import React from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { useLanguage } from "@/context/LanguageContext";

export const Footer: React.FC = () => {
  const { t } = useLanguage();

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
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-3 pt-2 text-slate-400">
              <a
                href="https://github.com/azka13labib-ops/Spanel"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition flex items-center gap-1.5"
              >
                <GithubIcon className="w-4 h-4" />
                <span>{t("footer.repo")}</span>
              </a>
              <span>•</span>
              <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t("footer.mit")}
              </span>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              {t("footer.col_product")}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/installation/" className="hover:text-white transition">
                  {t("footer.install_guide")}
                </Link>
              </li>
              <li>
                <Link href="/features/" className="hover:text-white transition">
                  {t("footer.features")}
                </Link>
              </li>
              <li>
                <Link href="/docs/" className="hover:text-white transition">
                  {t("footer.docs")}
                </Link>
              </li>
              <li>
                <Link href="/changelog/" className="hover:text-white transition">
                  {t("footer.changelog")}
                </Link>
              </li>
              <li>
                <Link href="/roadmap/" className="hover:text-white transition">
                  {t("footer.roadmap")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Documentation Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              {t("footer.col_guides")}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/installation/#requirements" className="hover:text-white transition">
                  {t("footer.sys_req")}
                </Link>
              </li>
              <li>
                <Link href="/docs/deployment/" className="hover:text-white transition">
                  {t("footer.github_deploy")}
                </Link>
              </li>
              <li>
                <Link href="/features/" className="hover:text-white transition">
                  {t("footer.db_guide")}
                </Link>
              </li>
              <li>
                <Link href="/features/" className="hover:text-white transition">
                  {t("footer.env_vars")}
                </Link>
              </li>
              <li>
                <Link href="/features/" className="hover:text-white transition">
                  {t("footer.tailscale")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Community & Legal Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              {t("footer.col_legal")}
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/azka13labib-ops/Spanel/blob/main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  {t("footer.contributing")}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/azka13labib-ops/Spanel/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  {t("footer.issues")}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/azka13labib-ops/Spanel/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  {t("footer.security")}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/azka13labib-ops/Spanel/blob/main/README.md#lisensi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  {t("footer.license")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <p>{t("footer.copyright")}</p>
          <div className="flex items-center gap-4">
            <Link href="/installation/" className="hover:text-slate-300 transition">
              {t("footer.btn_install")}
            </Link>
            <span>•</span>
            <Link href="/docs/" className="hover:text-slate-300 transition">
              {t("footer.btn_docs")}
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
