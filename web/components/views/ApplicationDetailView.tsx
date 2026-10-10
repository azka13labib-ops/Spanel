"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Layers,
  Terminal,
  FileText,
  GitCommit,
  Key,
  Globe,
  ExternalLink,
  Play,
  RotateCcw,
  Square,
  Settings,
  ShieldCheck,
  GitBranch,
} from "lucide-react";
import { Project } from "@/types";
import { GraphiteTerminal } from "@/components/terminal/GraphiteTerminal";

interface ApplicationDetailViewProps {
  project: Project;
  onBack: () => void;
  onDeploy: (project: Project) => void;
  onRollback: (project: Project) => void;
  onViewLogs: (project: Project) => void;
  onOpenEnvVars: (project: Project) => void;
  onOpenSettings: (project: Project) => void;
  onContainerAction: (project: Project, action: "start" | "stop" | "restart") => void;
  onOpenTerminal?: (project: Project) => void;
  defaultTab?: "overview" | "deployments" | "logs" | "console" | "environment";
}

export const ApplicationDetailView: React.FC<ApplicationDetailViewProps> = ({
  project,
  onBack,
  onDeploy,
  onRollback,
  onViewLogs,
  onOpenEnvVars,
  onOpenSettings,
  onContainerAction,
  onOpenTerminal,
  defaultTab = "console",
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "deployments" | "logs" | "console" | "environment">(
    defaultTab
  );
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);

  const isRunning = project.status === "running";
  const activeDomain = project.custom_domain || project.magic_domain;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition shadow-2xs cursor-pointer"
            title="Kembali ke daftar aplikasi"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Applications</span>
              <span className="text-xs text-gray-300">/</span>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">{project.name}</h1>
              {isRunning ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Running</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  <span>Stopped</span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{project.repo_fullname}</p>
          </div>
        </div>

        {/* Quick App Actions */}
        <div className="flex items-center gap-2">
          {activeDomain && (
            <a
              href={`http://${activeDomain}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-indigo-600 font-mono text-xs font-medium transition shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Visit</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}

          {isRunning ? (
            <>
              <button
                onClick={() => onContainerAction(project, "restart")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition shadow-2xs cursor-pointer"
                title="Restart container"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restart</span>
              </button>
              <button
                onClick={() => onContainerAction(project, "stop")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium transition cursor-pointer"
                title="Stop container"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stop</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onContainerAction(project, "start")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition cursor-pointer"
              title="Start container"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start</span>
            </button>
          )}

          <button
            onClick={() => onDeploy(project)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Deploy</span>
          </button>

          <button
            onClick={() => onOpenSettings(project)}
            className="p-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition shadow-2xs cursor-pointer"
            title="Project Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5 Tab Navigation: Overview, Deployments, Logs, Console, Environment */}
      <div className="flex items-center gap-1 border-b border-gray-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("deployments")}
          className={`px-4 py-2.5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "deployments"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <GitCommit className="w-4 h-4" />
          <span>Deployments</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "logs"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Logs</span>
        </button>

        <button
          onClick={() => setActiveTab("console")}
          className={`px-4 py-2.5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "console"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Console</span>
          {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </button>

        <button
          onClick={() => setActiveTab("environment")}
          className={`px-4 py-2.5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "environment"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Environment</span>
        </button>
      </div>

      {/* Tab Panels */}
      {/* 1. Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Container Info
              </span>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Container Name</span>
                  <span className="font-mono font-medium text-gray-900">spanel-app-{project.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Image Tag</span>
                  <span className="font-mono text-gray-700">spanel/{project.name}:latest</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Host Port</span>
                  <span className="font-mono text-gray-700">0.0.0.0:{project.target_port || 3000}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Networking & Domain
              </span>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Public Domain</span>
                  <span className="font-mono text-indigo-600 truncate max-w-40">{activeDomain || "None"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Healthcheck</span>
                  <span className="font-mono text-gray-700">{project.healthcheck_path || "/"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">SSL / TLS</span>
                  <span className="text-emerald-700 font-medium">Automatic (Caddy/Nginx)</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Repository Source
              </span>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Repository</span>
                  <span className="font-mono text-gray-900 truncate max-w-40">{project.repo_fullname}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Default Branch</span>
                  <span className="font-mono text-gray-700">main</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Created At</span>
                  <span className="text-gray-700">
                    {new Date(project.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Application Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab("console")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition cursor-pointer"
              >
                <Terminal className="w-4 h-4 text-indigo-600" />
                <span>Open Container Console</span>
              </button>
              <button
                onClick={() => onViewLogs(project)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>View Runtime Logs</span>
              </button>
              <button
                onClick={() => onOpenEnvVars(project)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition cursor-pointer"
              >
                <Key className="w-4 h-4 text-amber-600" />
                <span>Manage Environment Variables</span>
              </button>
              <button
                onClick={() => onOpenSettings(project)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition cursor-pointer"
              >
                <Settings className="w-4 h-4 text-gray-600" />
                <span>Domains & Project Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Deployments Tab */}
      {activeTab === "deployments" && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Deployment History</h3>
              <p className="text-xs text-gray-500">Riwayat build dan deployment pipeline aplikasi ini.</p>
            </div>
            <button
              onClick={() => onDeploy(project)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Trigger New Build</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            <div className="p-4 flex items-center justify-between text-xs bg-gray-50/50">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-gray-900 font-mono">Latest Production Deployment</span>
                <span className="text-[10px] text-gray-400 font-mono">spanel/{project.name}:latest</span>
              </div>
              <div className="flex items-center gap-4 text-gray-500 font-mono text-[11px]">
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-gray-400" />
                  <span>main</span>
                </span>
                <button
                  onClick={() => onViewLogs(project)}
                  className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-sans text-xs font-medium transition cursor-pointer"
                >
                  Inspect Logs
                </button>
                <button
                  onClick={() => onRollback(project)}
                  className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-sans text-xs font-medium transition cursor-pointer flex items-center gap-1"
                  title="Rollback deployment"
                >
                  <RotateCcw className="w-3 h-3 text-amber-500" />
                  <span>Rollback</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Logs Tab */}
      {activeTab === "logs" && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Container Runtime Stream</h3>
              <p className="text-xs text-gray-500">Live stdout/stderr streaming dari container engine.</p>
            </div>
            <button
              onClick={() => onViewLogs(project)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Open Dedicated Log Console</span>
            </button>
          </div>

          <div className="bg-[#0B1020] text-gray-300 font-mono text-xs p-4 rounded-xl border border-[#263244] h-80 overflow-y-auto space-y-1">
            <div className="text-emerald-400">✓ Connected to container spanel-app-{project.name} stdout</div>
            <div className="text-gray-400">[info] Ready for requests on port {project.target_port || 3000}</div>
            <div className="text-gray-500">Tampilkan stream logs lengkap di modal inspeksi.</div>
          </div>
        </div>
      )}

      {/* 4. Console Tab (Graphite Container Terminal) */}
      {activeTab === "console" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Container Shell Console</h2>
              <p className="text-xs text-gray-500">
                Sesi interaktif /bin/sh di dalam isolated container <code className="font-mono text-indigo-600">spanel-app-{project.name}</code>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px]">Container Sandbox</span>
              </div>
              {onOpenTerminal && (
                <button
                  onClick={() => onOpenTerminal(project)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition shadow-2xs cursor-pointer"
                  title="Open terminal in a modal window"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Popout</span>
                </button>
              )}
            </div>
          </div>

          <GraphiteTerminal
            project={project}
            onStartContainer={() => onContainerAction(project, "start")}
            className="w-full h-140"
            isExpanded={isTerminalExpanded}
            onToggleExpand={() => setIsTerminalExpanded(!isTerminalExpanded)}
          />
        </div>
      )}

      {/* 5. Environment Tab */}
      {activeTab === "environment" && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Environment Variables</h3>
              <p className="text-xs text-gray-500">Kelola variabel lingkungan terenkripsi untuk container aplikasi ini.</p>
            </div>
            <button
              onClick={() => onOpenEnvVars(project)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Buka Editor Variabel</span>
            </button>
          </div>
          <div className="p-8 text-center text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl">
            Klik tombol di atas untuk melihat dan mengedit environment variables secara aman.
          </div>
        </div>
      )}
    </div>
  );
};
