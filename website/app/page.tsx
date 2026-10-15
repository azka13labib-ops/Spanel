"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Layers,
  ArrowRight,
  Terminal,
  BookOpen,
  GitBranch,
  Search,
  Cpu,
  Database,
  Globe,
  Activity,
  Shield,
  FileCode,
  CheckCircle2,
  Server,
  Zap,
  Box,
  KeyRound,
  ExternalLink,
  Code2,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function HomePage() {
  const { t } = useLanguage();

  const features = [
    {
      icon: GitBranch,
      title: t("home.feat1_title"),
      description: t("home.feat1_desc"),
      badge: "Verified",
    },
    {
      icon: Search,
      title: t("home.feat2_title"),
      description: t("home.feat2_desc"),
      badge: "Nixpacks",
    },
    {
      icon: Box,
      title: t("home.feat3_title"),
      description: t("home.feat3_desc"),
      badge: "Docker Net",
    },
    {
      icon: Database,
      title: t("home.feat4_title"),
      description: t("home.feat4_desc"),
      badge: "1-Click",
    },
    {
      icon: Globe,
      title: t("home.feat5_title"),
      description: t("home.feat5_desc"),
      badge: "Traefik",
    },
    {
      icon: Activity,
      title: t("home.feat6_title"),
      description: t("home.feat6_desc"),
      badge: "Live SSE",
    },
    {
      icon: Shield,
      title: t("home.feat7_title"),
      description: t("home.feat7_desc"),
      badge: "AES-256",
    },
    {
      icon: Terminal,
      title: t("home.feat8_title"),
      description: t("home.feat8_desc"),
      badge: "WebShell",
    },
  ];

  const steps = [
    {
      number: "1",
      title: t("home.step1_title"),
      description: t("home.step1_desc"),
    },
    {
      number: "2",
      title: t("home.step2_title"),
      description: t("home.step2_desc"),
    },
    {
      number: "3",
      title: t("home.step3_title"),
      description: t("home.step3_desc"),
    },
    {
      number: "4",
      title: t("home.step4_title"),
      description: t("home.step4_desc"),
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-200/80 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              <span>{t("home.badge")}</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
              {t("home.hero_title_1")} <br />
              <span className="text-indigo-600">{t("home.hero_title_2")}</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              {t("home.hero_subtitle")}
            </p>

            {/* Primary Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/installation/"
                className="min-h-11 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow transition active:scale-95"
              >
                <span>{t("home.btn_install")}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs/"
                className="min-h-11 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition"
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>{t("home.btn_docs")}</span>
              </Link>
            </div>

            {/* Three Pillar Badges */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
              <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/60 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{t("home.pillar1_title")}</h4>
                  <p className="text-[11px] text-slate-500">{t("home.pillar1_desc")}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/60 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{t("home.pillar2_title")}</h4>
                  <p className="text-[11px] text-slate-500">{t("home.pillar2_desc")}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/60 flex items-start gap-2.5">
                <Server className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{t("home.pillar3_title")}</h4>
                  <p className="text-[11px] text-slate-500">{t("home.pillar3_desc")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Genuine Product Screenshot Preview */}
          <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
            <div className="rounded-2xl p-2 sm:p-3 bg-slate-900/5 ring-1 ring-slate-900/10 shadow-2xl backdrop-blur-xs">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                {/* Browser bar */}
                <div className="px-4 py-3 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full bg-rose-400 shrink-0" />
                    <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
                    <span className="ml-2 font-mono text-[11px] text-slate-400 truncate hidden xs:inline">
                      https://spanel.your-vps.internal:8090
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold shrink-0">
                    {t("home.preview_badge")}
                  </span>
                </div>

                {/* Screenshot image */}
                <div className="relative aspect-16/10 w-full bg-slate-100 overflow-hidden">
                  <Image
                    src="/images/dashboard-hero.png"
                    alt="sPanel Production Dashboard Overview showing applications, Docker containers, and live resource metrics"
                    fill
                    priority
                    className="object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section ("Powerful Features for Modern Deployments") */}
      <section className="py-16 md:py-24 bg-slate-50/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t("home.features_title")}
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              {t("home.features_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {feature.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dark Contrast Section ("Built for developers, by developers.") */}
      <section className="py-16 md:py-24 bg-slate-950 text-white border-b border-slate-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Visual Mockup / Screen Overlays */}
            <div className="lg:col-span-7 relative">
              <div className="relative rounded-2xl p-2 bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
                <div className="relative aspect-16/10 w-full rounded-xl overflow-hidden bg-slate-950">
                  <Image
                    src="/images/deployment-logs.png"
                    alt="sPanel Real-time Deployment Logs and Build Stream"
                    fill
                    className="object-cover object-top"
                  />
                </div>
              </div>

              {/* Inset overlay card showing AI diagnosis */}
              <div className="hidden sm:block absolute -bottom-6 -right-6 w-72 rounded-xl p-1 bg-slate-900/90 border border-slate-700 shadow-2xl backdrop-blur-md">
                <div className="relative aspect-4/3 w-full rounded-lg overflow-hidden">
                  <Image
                    src="/images/ai-devops.png"
                    alt="sPanel AI DevOps Assistant error diagnosis card"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Copy & Checklist */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t("home.dark_badge")}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {t("home.dark_title_1")} <br />
                <span className="text-indigo-400">{t("home.dark_title_2")}</span>
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                {t("home.dark_desc")}
              </p>

              <div className="space-y-3 pt-2">
                {[
                  t("home.dark_check1"),
                  t("home.dark_check2"),
                  t("home.dark_check3"),
                  t("home.dark_check4"),
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Link
                  href="/installation/"
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
                >
                  {t("home.dark_btn_install")}
                </Link>
                <Link
                  href="/features/"
                  className="px-5 py-2.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition"
                >
                  {t("home.dark_btn_features")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section ("Get Started in Minutes") */}
      <section className="py-16 md:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t("home.steps_title")}
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              {t("home.steps_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((step, idx) => (
              <div key={idx} className="relative flex flex-col items-center text-center space-y-3 group">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-base flex items-center justify-center shadow-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {step.number}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/installation/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow transition"
            >
              <span>{t("home.btn_view_install_guide")}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Architecture Overview Section */}
      <section className="py-16 md:py-20 bg-slate-50 border-b border-slate-200 text-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto space-y-4 text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-200/80 text-slate-700 font-mono">
              <Code2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t("home.arch_badge")}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t("home.arch_title")}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t("home.arch_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">{t("home.arch1_title")}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t("home.arch1_desc")}
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Box className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">{t("home.arch2_title")}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t("home.arch2_desc")}
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">{t("home.arch3_title")}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t("home.arch3_desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t("home.cta_title")}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            {t("home.cta_subtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/installation/"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow transition"
            >
              <Terminal className="w-4 h-4 text-indigo-200" />
              <span>{t("home.btn_install")}</span>
            </Link>
            <Link
              href="/docs/"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>{t("common.read_docs")}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

