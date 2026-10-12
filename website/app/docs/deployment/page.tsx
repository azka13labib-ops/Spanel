import React from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  GitBranch,
  Terminal,
  Layers,
  ExternalLink,
  ShieldAlert,
  Info,
} from "lucide-react";

export default function DeploymentGuidePage() {
  const steps = [
    {
      number: "1",
      title: "Create a New Application",
      description: "Navigate to Applications in the sPanel dashboard, click '+ New Application', and select GitHub as the deployment source.",
      details: "sPanel will query your authorized repositories and display available projects.",
    },
    {
      number: "2",
      title: "Choose Repository & Branch",
      description: "Select your GitHub repository from the dropdown and specify the branch you want to track (e.g. main or production).",
      details: "You can also specify a custom root directory if your project is structured as a monorepo.",
    },
    {
      number: "3",
      title: "Configure Build Settings & Environment",
      description: "Set the framework detection preset (or let Nixpacks detect automatically), specify runtime ports, and inject environment variables.",
      details: "If your project requires a database, click 'Attach Database' to automatically link PostgreSQL, MySQL, or Redis.",
    },
    {
      number: "4",
      title: "Trigger Deployment",
      description: "Click 'Deploy Application'. sPanel will trigger an ephemeral Nixpacks build container and stream live logs directly to your browser.",
      details: "Once the container responds to HTTP health checks, Traefik routes incoming traffic with zero downtime.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 border-b border-slate-200 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/docs/" className="hover:text-slate-900 transition">
            Documentation
          </Link>
          <span>&gt;</span>
          <span className="text-slate-900 font-semibold">Deployment Guide</span>
        </nav>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Deployment Guide
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Learn how to deploy your application from GitHub using sPanel with zero-downtime traffic switching.
          </p>
        </div>

        {/* Prerequisites Box */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span>Prerequisites</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>1. Connected GitHub account</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>2. Application repository ready</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>3. sPanel installed and active</span>
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
              <p className="text-[11px] text-slate-500 leading-relaxed pl-11 border-t border-slate-100 pt-2 font-mono">
                💡 {step.details}
              </p>
            </div>
          ))}
        </div>

        {/* Success Banner */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold">Automatic Staging URL: </span>
            <span>Your application will be instantly available at the configured domain (or </span>
            <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-bold">
              &lt;app&gt;.&lt;ip&gt;.sslip.io
            </code>
            <span>) after the deployment health checks pass.</span>
          </div>
        </div>

        {/* Prev / Next Navigation */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <Link
            href="/docs/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Overview</span>
          </Link>
          <Link
            href="/installation/"
            className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
          >
            <span>Installation Guide</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
