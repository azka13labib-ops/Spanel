"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function DeploymentGuidePage() {
  const { t } = useLanguage();

  const steps = [
    {
      number: "1",
      title: t("deploy.step1_title"),
      description: t("deploy.step1_desc"),
      details: t("deploy.step1_detail"),
    },
    {
      number: "2",
      title: t("deploy.step2_title"),
      description: t("deploy.step2_desc"),
      details: t("deploy.step2_detail"),
    },
    {
      number: "3",
      title: t("deploy.step3_title"),
      description: t("deploy.step3_desc"),
      details: t("deploy.step3_detail"),
    },
    {
      number: "4",
      title: t("deploy.step4_title"),
      description: t("deploy.step4_desc"),
      details: t("deploy.step4_detail"),
    },
  ];

  return (
    <div className="space-y-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/docs/" className="hover:text-slate-900 transition">
            {t("docs.breadcrumb_root")}
          </Link>
          <span>&gt;</span>
          <span className="text-slate-900 font-semibold">{t("deploy.breadcrumb")}</span>
        </nav>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("deploy.title")}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t("deploy.subtitle")}
          </p>
        </div>

        {/* Prerequisites Box */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span>{t("deploy.prerequisites")}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{t("deploy.prereq_1")}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{t("deploy.prereq_2")}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{t("deploy.prereq_3")}</span>
            </div>
          </div>
        </div>

        {/* Step-by-Step Sequence */}
        <div className="space-y-6">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {step.number}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {step.title}
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-11">
                {step.description}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 leading-relaxed pl-11 border-t border-slate-100 pt-2 font-mono">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{step.details}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Success Banner */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold">{t("deploy.staging_title")}</span>
            <span>{t("deploy.staging_desc_prefix")}</span>
            <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-bold">
              &lt;app&gt;.&lt;ip&gt;.sslip.io
            </code>
            <span>{t("deploy.staging_desc_suffix")}</span>
          </div>
        </div>

        {/* Prev / Next Navigation */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <Link
            href="/docs/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("deploy.back_btn")}</span>
          </Link>
          <Link
            href="/installation/"
            className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
          >
            <span>{t("deploy.install_btn")}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
  );
}

