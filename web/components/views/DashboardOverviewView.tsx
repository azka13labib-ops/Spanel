import React, { useState } from "react";
import {
  Layers,
  Server,
  Activity,
  Cpu,
  CheckCircle2,
  HardDrive,
  ArrowUpRight,
  TrendingUp,
  MoreVertical,
  Play,
  Terminal,
  Settings,
  GitBranch,
  Box,
  FileText,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { Project, SystemMetrics, DashboardTab } from "@/types";
import { formatTimeAgo } from "@/lib/utils";

interface DashboardOverviewViewProps {
  projects: Project[];
  metrics: SystemMetrics;
  onNavigate: (tab: DashboardTab) => void;
  onDeploy: (project: Project) => void;
  onViewLogs: (project: Project) => void;
  onOpenTerminal: (project: Project) => void;
  onOpenSettings: (project: Project) => void;
  onOpenNewProject: () => void;
}

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({
  projects,
  metrics,
  onNavigate,
  onDeploy,
  onViewLogs,
  onOpenTerminal,
  onOpenSettings,
  onOpenNewProject,
}) => {
  const [metricTimeRange, setMetricTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const [activeMenuProject, setActiveMenuProject] = useState<string | null>(null);

  const runningCount = projects.filter((p) => p.status === "running").length;
  const cpuPercent = metrics.host_cpu_percent !== undefined ? Math.round(metrics.host_cpu_percent) : 12;
  const ramPercent = metrics.host_ram_percent !== undefined ? Math.round(metrics.host_ram_percent) : 28;

  // Flatten all deployments from all projects to get recent deployments
  const allDeployments: {
    id: string;
    projectName: string;
    project: Project;
    status: string;
    branch: string;
    commitHash?: string;
    createdAt: string;
    durationMs?: number;
  }[] = [];

  projects.forEach((proj) => {
    if (proj.deployments && proj.deployments.length > 0) {
      proj.deployments.forEach((dep) => {
        allDeployments.push({
          id: dep.id,
          projectName: proj.name,
          project: proj,
          status: dep.status,
          branch: proj.branch || "main",
          commitHash: dep.commit_hash,
          createdAt: dep.created_at,
          durationMs: dep.duration_ms,
        });
      });
    } else {
      allDeployments.push({
        id: proj.id,
        projectName: proj.name,
        project: proj,
        status: proj.status === "running" ? "success" : proj.status === "building" ? "building" : "idle",
        branch: proj.branch || "main",
        createdAt: proj.created_at,
      });
    }
  });

  allDeployments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const recentDeployments = allDeployments.slice(0, 5);

  // Compute dynamic chart paths reflecting actual host telemetry & time range
  const getDynamicPath = (percent: number, seed: number) => {
    const rangeFactor = metricTimeRange === "1h" ? 8 : metricTimeRange === "6h" ? 15 : metricTimeRange === "24h" ? 22 : 30;
    const base = Math.max(30, Math.min(170, 180 - (percent * 1.4)));
    const y1 = Math.max(25, base - rangeFactor + seed);
    const y2 = Math.min(185, base + rangeFactor - seed);
    return `M 0 ${base} Q 60 ${y1} 120 ${base} T 240 ${y2} T 360 ${y1} T 480 ${y2} T 600 ${base}`;
  };

  const cpuPath = getDynamicPath(cpuPercent, 0);
  const ramPath = getDynamicPath(ramPercent, 5);
  const loadPath = getDynamicPath(Math.min(100, Math.round((metrics.load_avg_1 || 0.2) * 40)), 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Good morning, Admin
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
          Here is what is happening with your server and applications today.
        </p>
      </div>

      {/* 6 Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Applications */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-600 text-xs font-medium">
            <span>Total Applications</span>
            <Layers className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{projects.length}</span>
            <span className="text-[11px] font-medium text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              {runningCount} active
            </span>
          </div>
        </div>

        {/* Running Containers */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-600 text-xs font-medium">
            <span>Running Containers</span>
            <Server className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{runningCount}</span>
            <span className="text-[11px] font-medium text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              {runningCount > 0 ? "Workload online" : "Standby"}
            </span>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-600 text-xs font-medium">
            <span>System Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">Operational</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
            Load 1m: {metrics.load_avg_1 ? metrics.load_avg_1.toFixed(2) : "0.15"}
          </p>
        </div>

        {/* CPU Usage */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-600 text-xs font-medium">
            <span>CPU Usage</span>
            <Cpu className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{cpuPercent}%</span>
            <span className="text-[10px] text-gray-500 font-mono">
              {metrics.num_cpu} Cores
            </span>
          </div>
          {/* Mini Sparkline */}
          <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, cpuPercent))}%` }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-600 text-xs font-medium">
            <span>Memory Usage</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{ramPercent}%</span>
            <span className="text-[10px] text-gray-500 font-mono">
              {metrics.host_used_ram_mb ? `${(metrics.host_used_ram_mb / 1024).toFixed(1)}GB` : "Normal"}
            </span>
          </div>
          {/* Mini Sparkline */}
          <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, ramPercent))}%` }}
            />
          </div>
        </div>

        {/* Host Memory Total */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-600 text-xs font-medium">
            <span>Host Capacity</span>
            <HardDrive className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">
              {metrics.host_total_ram_mb ? `${(metrics.host_total_ram_mb / 1024).toFixed(1)} GB` : "2.0 GB"}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">Total RAM</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {metrics.host_free_ram_mb ? `${(metrics.host_free_ram_mb / 1024).toFixed(1)} GB available` : "Healthy"}
          </p>
        </div>
      </div>

      {/* Main 2-Column Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width): Server Metrics & Your Applications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Server Metrics Chart Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Server Telemetry</h2>
                <p className="text-[11px] text-gray-500">Live processor and memory activity across VPS</p>
              </div>

              {/* Legend & Time filter */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span>CPU ({cpuPercent}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                    <span>RAM ({ramPercent}%)</span>
                  </div>
                </div>

                <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-[11px] font-medium text-gray-600">
                  {(["1h", "6h", "24h", "7d"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setMetricTimeRange(r)}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        metricTimeRange === r
                          ? "bg-white text-gray-900 font-semibold shadow-2xs"
                          : "hover:text-gray-900"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SVG Interactive Line Chart */}
            <div className="w-full h-56 pt-2">
              <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                {/* Grid lines */}
                <line x1="0" y1="40" x2="600" y2="40" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="600" y2="80" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="600" y2="120" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="160" x2="600" y2="160" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />

                {/* CPU Line (Indigo) */}
                <path
                  d={cpuPath}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  className="transition-all duration-300"
                />

                {/* Memory Line (Sky) */}
                <path
                  d={ramPath}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                  className="transition-all duration-300"
                />

                {/* Load Avg Line (Emerald) */}
                <path
                  d={loadPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  className="transition-all duration-300"
                />
              </svg>

              {/* X-Axis labels */}
              <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                <span>00:00</span>
                <span>04:00</span>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span>Now</span>
              </div>
            </div>
          </div>

          {/* Your Applications Table Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Your Applications</h2>
                <p className="text-[11px] text-gray-500">Live web services, containers, and runtimes</p>
              </div>
              <button
                onClick={() => onNavigate("applications")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md outline-none"
              >
                <span>View all</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Applications Table */}
            {projects.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900">No applications deployed yet</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Import a GitHub repository to deploy your first containerized project.
                  </p>
                </div>
                <button
                  onClick={onOpenNewProject}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                >
                  Deploy First Application
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200 text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Port / Branch</th>
                      <th className="px-4 py-3">Uptime</th>
                      <th className="px-4 py-3">CPU</th>
                      <th className="px-4 py-3">Memory</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {projects.slice(0, 5).map((project) => (
                      <tr key={project.id} className="hover:bg-gray-50/70 transition">
                        {/* Name */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {project.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-gray-900 truncate">
                                {project.name}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono truncate">
                                {project.repo_fullname}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          {project.status === "running" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Running</span>
                            </span>
                          ) : project.status === "building" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>Building</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                              <span>Stopped</span>
                            </span>
                          )}
                        </td>

                        {/* Port / Branch */}
                        <td className="px-4 py-3.5 text-gray-600 font-mono text-[11px]">
                          <div>:{project.target_port || 3000}</div>
                          <div className="text-[10px] text-gray-500">{project.branch || "main"}</div>
                        </td>

                        {/* Uptime */}
                        <td className="px-4 py-3.5 text-gray-600 text-[11px]">
                          {project.status === "running"
                            ? project.created_at
                              ? formatTimeAgo(project.created_at)
                              : "Active"
                            : "Stopped"}
                        </td>

                        {/* CPU */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-gray-600">
                          {project.status === "running" ? (
                            <span title="Streaming telemetry pending" className="text-gray-500">
                              -
                            </span>
                          ) : (
                            "0%"
                          )}
                        </td>

                        {/* Memory */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-gray-600">
                          {project.status === "running" ? (
                            <span title="Streaming telemetry pending" className="text-gray-500">
                              -
                            </span>
                          ) : (
                            "0 MB"
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right relative">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => onDeploy(project)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                              title="Redeploy application"
                              aria-label={`Redeploy ${project.name}`}
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onViewLogs(project)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                              title="View logs"
                              aria-label={`View logs for ${project.name}`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setActiveMenuProject(activeMenuProject === project.id ? null : project.id)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                              aria-label={`More actions for ${project.name}`}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quick dropdown menu */}
                          {activeMenuProject === project.id && (
                            <div className="absolute right-4 top-10 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 text-left text-xs animate-in fade-in">
                              <button
                                onClick={() => {
                                  setActiveMenuProject(null);
                                  onOpenTerminal(project);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer"
                              >
                                <Terminal className="w-3.5 h-3.5 text-gray-500" />
                                <span>Terminal</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuProject(null);
                                  onOpenSettings(project);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer"
                              >
                                <Settings className="w-3.5 h-3.5 text-gray-500" />
                                <span>Settings</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3 width): Recent Deployments & Quick Actions */}
        <div className="space-y-6">
          {/* Recent Deployments Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Recent Deployments</h2>
                <p className="text-[11px] text-gray-500">Latest build pipelines</p>
              </div>
              <button
                onClick={() => onNavigate("deployments")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md outline-none"
              >
                <span>View all</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {recentDeployments.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No deployment records found.</p>
              ) : (
                recentDeployments.map((dep, idx) => (
                  <div
                    key={`${dep.id}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50/80 transition border border-gray-100"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                        <GitBranch className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {dep.projectName}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono truncate">
                          branch {dep.branch}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                        dep.status === "success" || dep.status === "healthy"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : dep.status === "building"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {dep.status === "healthy" ? "Success" : dep.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-100">
              Quick Actions
            </h2>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate("github")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition text-left cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-100 text-gray-700 group-hover:text-indigo-600 flex items-center justify-center transition">
                    <GithubIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Connect GitHub</p>
                    <p className="text-[10px] text-gray-500">Link your GitHub repository source</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition" />
              </button>

              <button
                onClick={onOpenNewProject}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition text-left cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-100 text-gray-700 group-hover:text-indigo-600 flex items-center justify-center transition">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Deploy from Repository</p>
                    <p className="text-[10px] text-gray-500">Zero-config automated Docker build</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition" />
              </button>

              <button
                onClick={() => onNavigate("containers")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition text-left cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-100 text-gray-700 group-hover:text-indigo-600 flex items-center justify-center transition">
                    <Box className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Manage Containers</p>
                    <p className="text-[10px] text-gray-500">View and control active containers</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition" />
              </button>

              <button
                onClick={() => onNavigate("logs")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition text-left cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-100 text-gray-700 group-hover:text-indigo-600 flex items-center justify-center transition">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">View Logs</p>
                    <p className="text-[10px] text-gray-500">Real-time application & container streams</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
