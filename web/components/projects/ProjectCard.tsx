import React from "react";
import { FolderGit2, CheckCircle2, ExternalLink, Play, RotateCcw, Terminal, Key } from "lucide-react";
import { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  onDeploy: (project: Project) => void;
  onRollback: (project: Project) => void;
  onViewLogs: (project: Project) => void;
  onOpenEnvVars: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onDeploy,
  onRollback,
  onViewLogs,
  onOpenEnvVars,
}) => {
  return (
    <div className="glass-panel glass-card-hover rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/5 text-cyan-400">
              <FolderGit2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white hover:text-cyan-400 transition cursor-pointer">
                {project.name}
              </h3>
              <p className="text-xs text-slate-400">{project.repo_fullname}</p>
            </div>
          </div>

          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Healthy
          </span>
        </div>

        {/* Magic Domain Pill */}
        <div className="flex items-center justify-between text-xs bg-black/40 border border-white/5 rounded-xl p-3">
          <div className="flex items-center gap-2 truncate">
            <span className="text-slate-500">Domain:</span>
            <a
              href={`http://${project.magic_domain}`}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline font-mono truncate"
            >
              {project.magic_domain}
            </a>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-900/50 p-2 rounded-lg border border-white/5">
            <p className="text-slate-500">Branch</p>
            <p className="font-semibold text-slate-200">{project.branch}</p>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-lg border border-white/5">
            <p className="text-slate-500">Port</p>
            <p className="font-semibold text-cyan-400 font-mono">:{project.target_port}</p>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-lg border border-white/5">
            <p className="text-slate-500">Routing</p>
            <p className="font-semibold text-emerald-400">Traefik</p>
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
        <button
          onClick={() => onDeploy(project)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/10 hover:text-cyan-400 border border-white/10 text-xs font-semibold transition cursor-pointer"
        >
          <Play className="h-3.5 w-3.5" />
          Deploy
        </button>
        <button
          onClick={() => onOpenEnvVars(project)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-amber-500/10 hover:text-amber-400 border border-white/10 text-xs font-semibold text-slate-300 transition cursor-pointer"
          title="Environment Variables (.env)"
        >
          <Key className="h-3.5 w-3.5" />
          Env
        </button>
        <button
          onClick={() => onRollback(project)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-purple-500/10 hover:text-purple-400 border border-white/10 text-xs font-semibold transition cursor-pointer"
          title="Rollback deployment"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Rollback
        </button>
        <button
          onClick={() => onViewLogs(project)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 transition cursor-pointer"
          title="View logs"
        >
          <Terminal className="h-3.5 w-3.5" />
          Logs
        </button>
      </div>
    </div>
  );
};
