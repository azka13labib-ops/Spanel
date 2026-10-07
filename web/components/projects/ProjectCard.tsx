import React, { useState } from "react";
import {
  FolderGit2,
  ExternalLink,
  Play,
  RotateCcw,
  Terminal,
  Key,
  Webhook,
  Copy,
  Check,
  Settings,
  ShieldCheck,
  Square,
  Globe,
  GitBranch,
  Activity,
  Code2,
} from "lucide-react";
import { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  onDeploy: (project: Project) => void;
  onRollback: (project: Project) => void;
  onViewLogs: (project: Project) => void;
  onOpenEnvVars: (project: Project) => void;
  onOpenTerminal?: (project: Project) => void;
  onOpenSettings: (project: Project) => void;
  onContainerAction?: (project: Project, action: 'start'|'stop'|'restart') => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onDeploy,
  onRollback,
  onViewLogs,
  onOpenEnvVars,
  onOpenTerminal,
  onOpenSettings,
  onContainerAction,
}) => {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const getWebhookUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/projects/${project.id}/webhook`;
    }
    return `/api/projects/${project.id}/webhook`;
  };

  const handleCopyWebhook = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getWebhookUrl());
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const activeDomain = project.custom_domain || project.magic_domain || `${project.name}.localhost`;
  const domainUrl = `http://${activeDomain}`;

  const handleCopyDomain = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(domainUrl);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  // Detect tech badge
  const getTechBadge = () => {
    const name = (project.name + " " + project.repo_fullname).toLowerCase();
    if (name.includes("vite") || name.includes("react") || name.includes("portofolio") || name.includes("portfolio")) {
      return { label: "React / Vite", color: "bg-sky-50 text-sky-700 border-sky-200" };
    }
    if (name.includes("next")) {
      return { label: "Next.js", color: "bg-gray-100 text-gray-800 border-gray-300" };
    }
    if (name.includes("vue")) {
      return { label: "Vue.js", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (name.includes("python") || name.includes("django") || name.includes("fastapi")) {
      return { label: "Python", color: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    if (name.includes("go") || name.includes("golang")) {
      return { label: "Go", color: "bg-cyan-50 text-cyan-700 border-cyan-200" };
    }
    return { label: "Nixpacks Auto", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  };

  const tech = getTechBadge();

  return (
    <div className="bg-white rounded-xl border border-gray-200/90 p-5 flex flex-col justify-between space-y-4 hover:border-gray-300 hover:shadow-sm transition-all duration-150 group">
      <div className="space-y-3.5">
        {/* Top Bar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
              <FolderGit2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base text-gray-900 truncate">
                  {project.name}
                </h3>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tech.color}`}>
                  <Code2 className="h-2.5 w-2.5" />
                  {tech.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono truncate mt-0.5">{project.repo_fullname}</p>
            </div>
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Status Pill */}
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Healthy
            </span>

            {/* Project Settings */}
            <button
              onClick={() => onOpenSettings(project)}
              title="Project Settings"
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 border border-transparent hover:border-gray-200 transition cursor-pointer"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Domain Routing Box */}
        <div className="flex items-center justify-between text-xs bg-gray-50/90 border border-gray-200/80 rounded-lg px-3.5 py-2.5 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <a
              href={domainUrl}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:text-indigo-800 font-mono font-medium truncate hover:underline"
              title={activeDomain}
            >
              {activeDomain}
            </a>
            {project.custom_domain && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-sans">
                <ShieldCheck className="h-2.5 w-2.5 text-indigo-600" />
                Custom
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCopyDomain}
              title="Copy URL"
              className="p-1 rounded hover:bg-gray-200/70 text-gray-400 hover:text-gray-700 transition cursor-pointer"
            >
              {copiedDomain ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={domainUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 rounded hover:bg-gray-200/70 text-gray-400 hover:text-gray-700 transition"
              title="Open Website"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-2xs flex flex-col items-center justify-center">
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <GitBranch className="h-3 w-3" /> Branch
            </span>
            <span className="font-medium text-gray-800 font-mono truncate max-w-full px-1">{project.branch}</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-2xs flex flex-col items-center justify-center">
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Activity className="h-3 w-3" /> Port
            </span>
            <span className="font-semibold text-indigo-600 font-mono">:{project.target_port}</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-2xs flex flex-col items-center justify-center">
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Proxy
            </span>
            <span className="font-medium text-emerald-600 font-sans">Traefik SSL</span>
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
        {/* Container Lifecycle Controls */}
        {onContainerAction && (
          <div className="flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-md p-0.5">
            <button
              onClick={() => onContainerAction(project, 'start')}
              title="Start Container"
              className="p-1.5 rounded hover:bg-white text-gray-500 hover:text-emerald-600 hover:shadow-2xs transition cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onContainerAction(project, 'restart')}
              title="Restart Container"
              className="p-1.5 rounded hover:bg-white text-gray-500 hover:text-indigo-600 hover:shadow-2xs transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onContainerAction(project, 'stop')}
              title="Stop Container"
              className="p-1.5 rounded hover:bg-white text-gray-500 hover:text-rose-600 hover:shadow-2xs transition cursor-pointer"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Copy Webhook Button */}
        <button
          onClick={handleCopyWebhook}
          title="Copy GitHub Auto-Deploy Webhook"
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 transition cursor-pointer shadow-2xs"
        >
          <Webhook className="h-3 w-3 text-indigo-500" />
          <span>{copiedWebhook ? "Copied!" : "Webhook"}</span>
          {copiedWebhook ? <Check className="h-3 w-3 text-emerald-600" /> : null}
        </button>

        {/* Tool Action Buttons */}
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <button
            onClick={() => onOpenEnvVars(project)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 transition cursor-pointer shadow-2xs"
            title="Environment Variables (.env)"
          >
            <Key className="h-3 w-3 text-amber-500" />
            <span>Env</span>
          </button>

          {onOpenTerminal && (
            <button
              onClick={() => onOpenTerminal(project)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 transition cursor-pointer shadow-2xs"
              title="Open Interactive Shell Terminal"
            >
              <Terminal className="h-3 w-3 text-indigo-500" />
              <span>Shell</span>
            </button>
          )}

          <button
            onClick={() => onViewLogs(project)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 transition cursor-pointer shadow-2xs"
            title="View Live Logs"
          >
            <Activity className="h-3 w-3 text-sky-500" />
            <span>Logs</span>
          </button>

          <button
            onClick={() => onRollback(project)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 transition cursor-pointer shadow-2xs"
            title="Rollback to Previous Image"
          >
            <RotateCcw className="h-3 w-3 text-purple-500" />
            <span>Rollback</span>
          </button>

          <button
            onClick={() => onDeploy(project)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
            title="Trigger Full Rebuild & Deploy"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Deploy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
