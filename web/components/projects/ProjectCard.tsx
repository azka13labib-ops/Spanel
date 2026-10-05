import React, { useState } from "react";
import { FolderGit2, CheckCircle2, ExternalLink, Play, RotateCcw, Terminal, Key, Webhook, Copy, Check, Settings } from "lucide-react";
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

  const getWebhookUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/projects/${project.id}/webhook`;
    }
    return `/api/projects/${project.id}/webhook`;
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(getWebhookUrl());
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-700">
              <FolderGit2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 cursor-pointer">
                {project.name}
              </h3>
              <p className="text-xs text-gray-500">{project.repo_fullname}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWebhook}
              title="Copy GitHub Auto-Deploy Webhook URL"
              className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition cursor-pointer"
            >
              <Webhook className="h-3 w-3" />
              <span>{copiedWebhook ? "Copied" : "Webhook"}</span>
              {copiedWebhook ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-gray-400" />
              )}
            </button>

            {onContainerAction && (
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-1 py-1 mr-2">
                <button
                  onClick={() => onContainerAction(project, 'start')}
                  title="Start Container"
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition"
                >
                  <Play className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onContainerAction(project, 'restart')}
                  title="Restart Container"
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onContainerAction(project, 'stop')}
                  title="Stop Container"
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition"
                >
                  <div className="w-3 h-3 rounded-sm bg-current" />
                </button>
              </div>
            )}

            <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 className="h-3 w-3" />
              Healthy
            </span>

            <button
              onClick={() => onOpenSettings(project)}
              title="Project Settings"
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer ml-1"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Magic Domain Pill */}
        <div className="flex items-center justify-between text-xs bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 truncate">
            <span className="text-gray-500">Domain:</span>
            <a
              href={`http://${project.magic_domain}`}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:underline font-mono truncate"
            >
              {project.magic_domain}
            </a>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-2" />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white p-2 rounded border border-gray-200">
            <p className="text-gray-500">Branch</p>
            <p className="font-medium text-gray-900">{project.branch}</p>
          </div>
          <div className="bg-white p-2 rounded border border-gray-200">
            <p className="text-gray-500">Port</p>
            <p className="font-medium text-indigo-600 font-mono">:{project.target_port}</p>
          </div>
          <div className="bg-white p-2 rounded border border-gray-200">
            <p className="text-gray-500">Routing</p>
            <p className="font-medium text-green-600">Traefik</p>
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onDeploy(project)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 transition cursor-pointer shadow-xs"
        >
          <Play className="h-3 w-3" />
          Deploy
        </button>
        <button
          onClick={() => onOpenEnvVars(project)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 transition cursor-pointer shadow-xs"
          title="Environment Variables (.env)"
        >
          <Key className="h-3 w-3" />
          Env
        </button>
        {onOpenTerminal && (
          <button
            onClick={() => onOpenTerminal(project)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 transition cursor-pointer shadow-xs"
            title="Open Interactive Shell Terminal"
          >
            <Terminal className="h-3 w-3" />
            Shell
          </button>
        )}
        <button
          onClick={() => onRollback(project)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 transition cursor-pointer shadow-xs"
          title="Rollback deployment"
        >
          <RotateCcw className="h-3 w-3" />
          Rollback
        </button>
        <button
          onClick={() => onViewLogs(project)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 transition cursor-pointer shadow-xs"
          title="View logs"
        >
          <Terminal className="h-3 w-3" />
          Logs
        </button>
      </div>
    </div>
  );
};

