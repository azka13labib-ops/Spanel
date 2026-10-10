import React, { useState } from "react";
import {
  Server,
  Play,
  Square,
  RotateCcw,
  Terminal,
  FileText,
  Search,
} from "lucide-react";
import { Project } from "@/types";

interface ContainersViewProps {
  projects: Project[];
  onContainerAction: (project: Project, action: "start" | "stop" | "restart") => void;
  onOpenTerminal: (project: Project) => void;
  onViewLogs: (project: Project) => void;
}

export const ContainersView: React.FC<ContainersViewProps> = ({
  projects,
  onContainerAction,
  onOpenTerminal,
  onViewLogs,
}) => {
  const [search, setSearch] = useState("");

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.repo_fullname.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Containers</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          Inspect and control Docker container instances, ports, and logs running on this VPS.
        </p>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search container by name..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans"
          />
        </div>
      </div>

      {/* Containers Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">No active containers found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Containers are automatically spun up when an application or service is deployed.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-5 py-3">Container Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Host Port</th>
                  <th className="px-4 py-3">CPU</th>
                  <th className="px-4 py-3">Memory</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filtered.map((project) => {
                  const isRunning = project.status === "running";
                  const containerName = `spanel-app-${project.name}`;

                  return (
                    <tr key={project.id} className="hover:bg-gray-50/70 transition">
                      {/* Container Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                            <Server className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-gray-900 block">
                              {containerName}
                            </span>
                            <span className="text-[10px] text-gray-400 block">
                              App: {project.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        {isRunning ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Up (healthy)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            <span>Exited</span>
                          </span>
                        )}
                      </td>

                      {/* Image */}
                      <td className="px-4 py-4 font-mono text-[11px] text-gray-600">
                        <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-200/70 truncate max-w-40 inline-block">
                          spanel/{project.name}:latest
                        </span>
                      </td>

                      {/* Host Port */}
                      <td className="px-4 py-4 font-mono text-[11px] text-gray-700">
                        0.0.0.0:{project.target_port || 3000}
                      </td>

                      {/* CPU */}
                      <td className="px-4 py-4 font-mono text-[11px] text-gray-600">
                        {isRunning ? "2.1%" : "0.0%"}
                      </td>

                      {/* Memory */}
                      <td className="px-4 py-4 font-mono text-[11px] text-gray-600">
                        {isRunning ? "128 MB" : "0 MB"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {isRunning ? (
                            <button
                              onClick={() => onContainerAction(project, "stop")}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-amber-600 transition cursor-pointer"
                              title="Stop container"
                            >
                              <Square className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onContainerAction(project, "start")}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-emerald-600 transition cursor-pointer"
                              title="Start container"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => onContainerAction(project, "restart")}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition cursor-pointer"
                            title="Restart container"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenTerminal(project)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition cursor-pointer"
                            title="Open shell terminal"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onViewLogs(project)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition cursor-pointer"
                            title="View container logs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
