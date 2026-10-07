import React, { useState } from "react";
import { Project } from "@/types";
import { ProjectCard } from "./ProjectCard";
import { FolderGit2, Search, Plus, Shield, Terminal, Zap, Filter } from "lucide-react";

interface ProjectGridProps {
  projects: Project[];
  onDeploy: (project: Project) => void;
  onRollback: (project: Project) => void;
  onViewLogs: (project: Project) => void;
  onOpenEnvVars: (project: Project) => void;
  onOpenTerminal?: (project: Project) => void;
  onOpenSettings: (project: Project) => void;
  onContainerAction?: (project: Project, action: 'start'|'stop'|'restart') => void;
  onOpenNewProject?: () => void;
}

export const ProjectGrid: React.FC<ProjectGridProps> = ({
  projects,
  onDeploy,
  onRollback,
  onViewLogs,
  onOpenEnvVars,
  onOpenTerminal,
  onOpenSettings,
  onContainerAction,
  onOpenNewProject,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = projects.filter((proj) => {
    const query = searchQuery.toLowerCase();
    return (
      proj.name.toLowerCase().includes(query) ||
      proj.repo_fullname.toLowerCase().includes(query) ||
      (proj.custom_domain && proj.custom_domain.toLowerCase().includes(query)) ||
      (proj.magic_domain && proj.magic_domain.toLowerCase().includes(query))
    );
  });

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-xs">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
          <FolderGit2 className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">No projects deployed yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Connect your GitHub account or repository to deploy your first application with zero-config containerization and automated Traefik routing.
          </p>
        </div>

        {onOpenNewProject && (
          <button
            onClick={onOpenNewProject}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Deploy First Project</span>
          </button>
        )}

        {/* Feature Highlights */}
        <div className="pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-xs">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-gray-900">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Zero Config</span>
            </div>
            <p className="text-gray-500">Auto-detects React, Vite, Next.js, Node, Python, and Go.</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-gray-900">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>Automatic SSL</span>
            </div>
            <p className="text-gray-500">Traefik reverse proxy handles dynamic routing and Let&apos;s Encrypt.</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-gray-900">
              <Terminal className="h-3.5 w-3.5 text-indigo-500" />
              <span>Built-in Web Shell</span>
            </div>
            <p className="text-gray-500">Live container logs, interactive terminal, and encrypted env vars.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-gray-200/90 shadow-2xs">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects by name, repo, or domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-md bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 placeholder-gray-400 transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            Showing <strong className="text-gray-900 font-semibold">{filteredProjects.length}</strong> of {projects.length} projects
          </span>
          {onOpenNewProject && (
            <button
              onClick={onOpenNewProject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition cursor-pointer shadow-2xs ml-2"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add App</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 space-y-2">
          <Filter className="h-6 w-6 mx-auto text-gray-400" />
          <p className="text-sm font-medium text-gray-700">No projects match &ldquo;{searchQuery}&rdquo;</p>
          <p className="text-xs text-gray-400">Try adjusting your search terms</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredProjects.map((proj) => (
            <ProjectCard
              key={proj.id}
              project={proj}
              onDeploy={onDeploy}
              onRollback={onRollback}
              onViewLogs={onViewLogs}
              onOpenEnvVars={onOpenEnvVars}
              onOpenTerminal={onOpenTerminal}
              onOpenSettings={onOpenSettings}
              onContainerAction={onContainerAction}
            />
          ))}
        </div>
      )}
    </div>
  );
};
