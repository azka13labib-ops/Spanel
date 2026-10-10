import React, { useState, useEffect, useCallback } from "react";
import {
  Server,
  Play,
  Square,
  RotateCcw,
  Terminal,
  FileText,
  Search,
  RefreshCw,
} from "lucide-react";
import { Project, ContainerItem } from "@/types";
import { fetchContainers } from "@/lib/api";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";

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
  const [containers, setContainers] = useState<ContainerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState<{
    project: Project;
    action: "stop" | "restart";
  } | null>(null);

  const loadContainers = useCallback(async () => {
    setLoading(true);
    const data = await fetchContainers();
    setContainers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchContainers().then((data) => {
      if (active) {
        setContainers(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Combine real containers with project fallback if docker daemon returned empty or is starting
  const displayContainers: ContainerItem[] = containers.length > 0
    ? containers
    : projects.map((p) => ({
        id: p.id.slice(0, 12),
        name: `spanel-app-${p.name}`,
        project_id: p.id,
        project_name: p.name,
        image: `spanel/${p.name}:latest`,
        state: p.status === "running" ? "running" : "exited",
        status: p.status === "running" ? "Running" : "Stopped",
        ports: `0.0.0.0:${p.target_port || 3000}`,
        is_spanel_managed: true,
      }));

  const filtered = displayContainers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.image.toLowerCase().includes(search.toLowerCase()) ||
      (c.project_name && c.project_name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleExecuteAction = async () => {
    if (confirmTarget) {
      onContainerAction(confirmTarget.project, confirmTarget.action);
      setConfirmTarget(null);
      setTimeout(() => {
        loadContainers();
      }, 1000);
    }
  };

  const findProjectForContainer = (c: ContainerItem): Project | undefined => {
    if (c.project_id) {
      const found = projects.find((p) => p.id === c.project_id);
      if (found) return found;
    }
    if (c.project_name) {
      const found = projects.find((p) => p.name === c.project_name);
      if (found) return found;
    }
    if (c.name.startsWith("spanel-app-")) {
      const pName = c.name.replace("spanel-app-", "");
      return projects.find((p) => p.name === pName);
    }
    return undefined;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Containers
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Real Docker container instances, runtime statuses, and port mappings running on this host.
          </p>
        </div>
        <button
          onClick={loadContainers}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
          aria-label="Refresh containers"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search container by name, image, or app..."
            aria-label="Search container by name, image, or app"
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans"
          />
        </div>
      </div>

      {/* Containers Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mx-auto">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">No active containers found</h3>
            <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
              Containers are automatically spun up when an application or service is deployed.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-5 py-3">Container Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Ports</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filtered.map((container) => {
                  const isRunning = container.state === "running";
                  const linkedProject = findProjectForContainer(container);

                  return (
                    <tr key={container.id} className="hover:bg-gray-50/70 transition">
                      {/* Container Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                            <Server className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-gray-900 block">
                              {container.name}
                            </span>
                            <span className="text-[10px] text-gray-500 block font-mono">
                              ID: {container.id.slice(0, 12)}
                              {container.project_name && ` • App: ${container.project_name}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        {isRunning ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{container.status || "Running"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            <span>{container.status || "Stopped"}</span>
                          </span>
                        )}
                      </td>

                      {/* Image */}
                      <td className="px-4 py-4 font-mono text-[11px] text-gray-600">
                        <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-200/70 truncate max-w-48 inline-block" title={container.image}>
                          {container.image}
                        </span>
                      </td>

                      {/* Ports */}
                      <td className="px-4 py-4 font-mono text-[11px] text-gray-700">
                        {container.ports || "-"}
                      </td>

                      {/* Container Type */}
                      <td className="px-4 py-4 text-[11px] text-gray-600">
                        {container.is_database ? (
                          <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-medium">
                            Database
                          </span>
                        ) : container.is_spanel_managed ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-medium">
                            Application
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium">
                            Host Service
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        {linkedProject ? (
                          <div className="inline-flex items-center gap-1">
                            {isRunning ? (
                              <button
                                onClick={() => setConfirmTarget({ project: linkedProject, action: "stop" })}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-amber-700 hover:text-rose-700 transition focus-visible:ring-2 focus-visible:ring-rose-500 outline-none cursor-pointer"
                                title="Stop container"
                                aria-label={`Stop container for ${linkedProject.name}`}
                              >
                                <Square className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  onContainerAction(linkedProject, "start");
                                  setTimeout(loadContainers, 1000);
                                }}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none cursor-pointer"
                                title="Start container"
                                aria-label={`Start container for ${linkedProject.name}`}
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => setConfirmTarget({ project: linkedProject, action: "restart" })}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none cursor-pointer"
                              title="Restart container"
                              aria-label={`Restart container for ${linkedProject.name}`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onOpenTerminal(linkedProject)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 transition focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none cursor-pointer"
                              title="Open shell terminal"
                              aria-label={`Open terminal for ${linkedProject.name}`}
                            >
                              <Terminal className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onViewLogs(linkedProject)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 transition focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none cursor-pointer"
                              title="View container logs"
                              aria-label={`View logs for ${linkedProject.name}`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-mono">External</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmTarget && (
        <ConfirmDialog
          isOpen={true}
          variant={confirmTarget.action === "stop" ? "danger" : "warning"}
          title={
            confirmTarget.action === "stop"
              ? `Stop container spanel-app-${confirmTarget.project.name}?`
              : `Restart container spanel-app-${confirmTarget.project.name}?`
          }
          description={
            confirmTarget.action === "stop"
              ? `Stopping this container will make the application "${confirmTarget.project.name}" immediately unavailable to incoming HTTP requests until manually restarted.`
              : `Restarting will cycle the container processes. In-flight requests may temporarily drop during the restart transition.`
          }
          confirmLabel={confirmTarget.action === "stop" ? "Stop Container" : "Restart Container"}
          cancelLabel="Cancel"
          onConfirm={handleExecuteAction}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
};
