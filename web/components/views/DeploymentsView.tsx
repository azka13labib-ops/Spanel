import React, { useState } from "react";
import {
  GitCommit,
  GitBranch,
  FileText,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { Project } from "@/types";

interface DeploymentsViewProps {
  projects: Project[];
  onDeploy: (project: Project) => void;
  onViewLogs: (project: Project) => void;
  onRollback: (project: Project) => void;
}

export const DeploymentsView: React.FC<DeploymentsViewProps> = ({
  projects,
  onDeploy,
  onViewLogs,
  onRollback,
}) => {
  const [search, setSearch] = useState("");

  // Collect all deployments
  const deploymentsList: {
    id: string;
    project: Project;
    status: string;
    commitHash?: string;
    commitMessage?: string;
    branch: string;
    createdAt: string;
    durationMs?: number;
  }[] = [];

  projects.forEach((proj) => {
    if (proj.deployments && proj.deployments.length > 0) {
      proj.deployments.forEach((dep) => {
        deploymentsList.push({
          id: dep.id,
          project: proj,
          status: dep.status,
          commitHash: dep.commit_hash,
          commitMessage: dep.commit_message,
          branch: proj.branch || "main",
          createdAt: dep.created_at,
          durationMs: dep.duration_ms,
        });
      });
    } else {
      deploymentsList.push({
        id: proj.id,
        project: proj,
        status: proj.status === "running" ? "healthy" : proj.status === "building" ? "building" : "idle",
        branch: proj.branch || "main",
        createdAt: proj.created_at,
      });
    }
  });

  deploymentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = deploymentsList.filter(
    (d) =>
      d.project.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.commitMessage && d.commitMessage.toLowerCase().includes(search.toLowerCase())) ||
      (d.commitHash && d.commitHash.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Deployments</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Audit deployment history, build pipelines, and commit statuses across all applications.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by application or commit..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50/80 focus:bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans"
          />
        </div>
      </div>

      {/* Deployments Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <GitCommit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">No deployment logs found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Deploy an application to start recording build logs and deployment artifacts.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Application</th>
                  <th className="px-4 py-3">Commit / Message</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filtered.map((dep, idx) => {
                  const isSuccess = dep.status === "healthy" || dep.status === "success";
                  const isBuilding = dep.status === "building" || dep.status === "queued";
                  const isFailed = dep.status === "failed";

                  return (
                    <tr key={`${dep.id}-${idx}`} className="hover:bg-gray-50/70 transition">
                      {/* Status */}
                      <td className="px-5 py-4">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Success</span>
                          </span>
                        ) : isBuilding ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                            <span>Building</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <span>Ready</span>
                          </span>
                        )}
                      </td>

                      {/* Application */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{dep.project.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono truncate max-w-35">
                          {dep.project.repo_fullname}
                        </div>
                      </td>

                      {/* Commit */}
                      <td className="px-4 py-4 font-mono text-[11px] text-gray-700">
                        {dep.commitHash ? (
                          <div className="flex items-center gap-1.5">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-600">
                              {dep.commitHash.slice(0, 7)}
                            </span>
                            <span className="truncate max-w-45 text-gray-600">
                              {dep.commitMessage || "Update application"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Manual trigger</span>
                        )}
                      </td>

                      {/* Branch */}
                      <td className="px-4 py-4 font-mono text-[11px] text-gray-600">
                        <div className="inline-flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-gray-400" />
                          <span>{dep.branch}</span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-4 text-gray-600 text-[11px]">
                        {dep.durationMs ? `${Math.round(dep.durationMs / 1000)}s` : "24s"}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 text-gray-500 text-[11px]">
                        {new Date(dep.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => onViewLogs(dep.project)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-[11px] font-medium transition cursor-pointer"
                          >
                            <FileText className="w-3 h-3 text-gray-500" />
                            <span>Logs</span>
                          </button>
                          <button
                            onClick={() => onDeploy(dep.project)}
                            className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition cursor-pointer"
                            title="Re-run deployment"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onRollback(dep.project)}
                            className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-amber-600 transition cursor-pointer"
                            title="Rollback deployment"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
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
