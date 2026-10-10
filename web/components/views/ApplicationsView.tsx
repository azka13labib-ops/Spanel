import React, { useState } from "react";
import {
  Layers,
  Plus,
  Search,
  LayoutGrid,
  List,
  Play,
  RotateCcw,
  FileText,
  Terminal,
  Settings,
  Key,
  Globe,
  ExternalLink,
  Trash2,
  MoreVertical,
  Activity,
  Square,
} from "lucide-react";
import { Project } from "@/types";

interface ApplicationsViewProps {
  projects: Project[];
  searchQuery: string;
  onDeploy: (project: Project) => void;
  onRollback: (project: Project) => void;
  onViewLogs: (project: Project) => void;
  onOpenEnvVars: (project: Project) => void;
  onOpenTerminal: (project: Project) => void;
  onOpenSettings: (project: Project) => void;
  onContainerAction: (project: Project, action: "start" | "stop" | "restart") => void;
  onOpenNewProject: () => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  projects,
  searchQuery,
  onDeploy,
  onRollback,
  onViewLogs,
  onOpenEnvVars,
  onOpenTerminal,
  onOpenSettings,
  onContainerAction,
  onOpenNewProject,
}) => {
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped" | "building">("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [activeMenuProject, setActiveMenuProject] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.repo_fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.custom_domain && p.custom_domain.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "running") return p.status === "running";
    if (statusFilter === "stopped") return p.status !== "running" && p.status !== "building";
    if (statusFilter === "building") return p.status === "building";
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Applications</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage your deployed cloud applications, domains, and containers.
          </p>
        </div>

        <button
          onClick={onOpenNewProject}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      {/* Control Bar: Filter Pills & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {(
            [
              { id: "all", label: `All (${projects.length})` },
              { id: "running", label: `Running (${projects.filter((p) => p.status === "running").length})` },
              { id: "stopped", label: `Stopped (${projects.filter((p) => p.status !== "running" && p.status !== "building").length})` },
              { id: "building", label: `Building (${projects.filter((p) => p.status === "building").length})` },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                statusFilter === filter.id
                  ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* View Switcher: Table vs Grid */}
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg self-end sm:self-auto text-gray-600">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md transition cursor-pointer ${
              viewMode === "table" ? "bg-white text-gray-900 shadow-2xs" : "hover:text-gray-900"
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition cursor-pointer ${
              viewMode === "grid" ? "bg-white text-gray-900 shadow-2xs" : "hover:text-gray-900"
            }`}
            title="Card Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">No applications found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No applications matched "${searchQuery}". Try a different keyword.`
                : "Get started by importing your repository from GitHub or Docker."}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={onOpenNewProject}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer"
            >
              Create Application
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-5 py-3">Application</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Domain / Routing</th>
                  <th className="px-4 py-3">Port</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Uptime</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredProjects.map((project) => {
                  const activeDomain = project.custom_domain || project.magic_domain;
                  return (
                    <tr key={project.id} className="hover:bg-gray-50/70 transition">
                      {/* Application Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {project.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-900 block truncate">
                              {project.name}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono block truncate">
                              {project.repo_fullname}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        {project.status === "running" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Running</span>
                          </span>
                        ) : project.status === "building" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Building</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            <span>Stopped</span>
                          </span>
                        )}
                      </td>

                      {/* Domain / Routing */}
                      <td className="px-4 py-4 text-gray-600">
                        {activeDomain ? (
                          <a
                            href={`http://${activeDomain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-mono text-[11px] hover:underline"
                          >
                            <Globe className="w-3 h-3 text-gray-400" />
                            <span className="truncate max-w-[160px]">{activeDomain}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        ) : (
                          <span className="text-gray-400 text-[11px]">No domain</span>
                        )}
                      </td>

                      {/* Port */}
                      <td className="px-4 py-4 font-mono text-gray-700 text-[11px]">
                        :{project.target_port || 3000}
                      </td>

                      {/* Branch */}
                      <td className="px-4 py-4 font-mono text-gray-600 text-[11px]">
                        {project.branch || "main"}
                      </td>

                      {/* Uptime */}
                      <td className="px-4 py-4 text-gray-600 text-[11px]">
                        2d 4h
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right relative">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onDeploy(project)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition cursor-pointer"
                            title="Deploy"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onViewLogs(project)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition cursor-pointer"
                            title="Logs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenTerminal(project)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition cursor-pointer"
                            title="Terminal"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setActiveMenuProject(activeMenuProject === project.id ? null : project.id)
                            }
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Dropdown Menu */}
                        {activeMenuProject === project.id && (
                          <div className="absolute right-5 top-12 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-30 text-left text-xs animate-in fade-in">
                            <button
                              onClick={() => {
                                setActiveMenuProject(null);
                                onOpenSettings(project);
                              }}
                              className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5 text-gray-400" />
                              <span>Project Settings</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuProject(null);
                                onOpenEnvVars(project);
                              }}
                              className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer"
                            >
                              <Key className="w-3.5 h-3.5 text-gray-400" />
                              <span>Environment Variables</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuProject(null);
                                onRollback(project);
                              }}
                              className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                              <span>Rollback</span>
                            </button>

                            <div className="my-1 border-t border-gray-100" />

                            {project.status === "running" ? (
                              <button
                                onClick={() => {
                                  setActiveMenuProject(null);
                                  onContainerAction(project, "stop");
                                }}
                                className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-amber-600 cursor-pointer"
                              >
                                <Square className="w-3.5 h-3.5" />
                                <span>Stop Container</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveMenuProject(null);
                                  onContainerAction(project, "start");
                                }}
                                className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-emerald-600 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Start Container</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setActiveMenuProject(null);
                                onContainerAction(project, "restart");
                              }}
                              className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                              <span>Restart Container</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const activeDomain = project.custom_domain || project.magic_domain;
            return (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs hover:border-gray-300 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 leading-tight">
                          {project.name}
                        </h3>
                        <p className="text-[11px] text-gray-400 font-mono truncate max-w-[180px]">
                          {project.repo_fullname}
                        </p>
                      </div>
                    </div>

                    {project.status === "running" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Running</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        <span>Stopped</span>
                      </span>
                    )}
                  </div>

                  {activeDomain && (
                    <a
                      href={`http://${activeDomain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-mono hover:underline"
                    >
                      <Globe className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{activeDomain}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-mono text-[11px]">
                    :{project.target_port || 3000} ({project.branch || "main"})
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDeploy(project)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition cursor-pointer"
                      title="Redeploy"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onViewLogs(project)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition cursor-pointer"
                      title="Logs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenTerminal(project)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition cursor-pointer"
                      title="Terminal"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenSettings(project)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition cursor-pointer"
                      title="Settings"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
