import {
  LayoutDashboard,
  Layers,
  GitCommit,
  Server,
  Activity,
  Terminal,
  FileText,
  Settings,
  X,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { DashboardTab, SystemMetrics, GitHubStatus, VersionInfo } from "@/types";

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  projectCount: number;
  containerCount: number;
  metrics: SystemMetrics;
  githubStatus?: GitHubStatus | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  versionInfo?: VersionInfo | null;
  onOpenUpdateModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  projectCount,
  containerCount,
  metrics,
  githubStatus,
  isOpenMobile = false,
  onCloseMobile,
  versionInfo,
  onOpenUpdateModal,
}) => {
  const navItems: {
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "applications", label: "Applications", icon: Layers, badge: projectCount },
    { id: "terminal", label: "Terminal", icon: Terminal },
    { id: "deployments", label: "Deployments", icon: GitCommit },
    { id: "containers", label: "Containers", icon: Server, badge: containerCount },
    { id: "github", label: "GitHub", icon: GithubIcon },
    { id: "monitoring", label: "Monitoring", icon: Activity },
    { id: "logs", label: "Logs", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Map legacy tabs if needed
  const normalizedActiveTab =
    activeTab === "projects"
      ? "applications"
      : activeTab === "marketplace" || activeTab === "dns" || activeTab === "ai" || activeTab === "server"
      ? "settings"
      : activeTab;

  const cpuPercent = metrics.host_cpu_percent !== undefined ? Math.round(metrics.host_cpu_percent) : 12;
  const ramPercent = metrics.host_ram_percent !== undefined ? Math.round(metrics.host_ram_percent) : 28;
  const diskPercent = 38; // System disk estimation

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-gray-900 tracking-tight">sPanel</span>
                <button
                  onClick={onOpenUpdateModal}
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition cursor-pointer flex items-center gap-1 ${
                    versionInfo?.has_update
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 animate-pulse"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                  title={versionInfo?.has_update ? "Klik untuk melihat update terbaru" : `sPanel ${versionInfo?.current_version || "v1.0.0"}`}
                >
                  <span>{versionInfo?.current_version || "v1.0.0"}</span>
                  {versionInfo?.has_update && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              </div>
              <span className="text-[11px] text-gray-500">Zero-Config Hosting</span>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = normalizedActiveTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? "bg-indigo-50/80 text-indigo-700 font-semibold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-indigo-600" : "text-gray-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      isActive
                        ? "bg-indigo-200/60 text-indigo-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.id === "github" && githubStatus?.connected && (
                  <span
                    className="h-2 w-2 rounded-full bg-emerald-500"
                    title={`GitHub Connected as @${githubStatus.username}`}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Server Status & Hardware Widget (Bottom) */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-gray-800">
                Linux VPS Server
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {metrics.os} {metrics.arch}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Online</span>
            </span>
          </div>

          {/* Resource Bars */}
          <div className="space-y-2 text-[10px]">
            {/* CPU */}
            <div>
              <div className="flex justify-between text-gray-600 mb-1">
                <span>CPU ({metrics.num_cpu} Cores)</span>
                <span className="font-semibold text-gray-900">{cpuPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, cpuPercent))}%` }}
                />
              </div>
            </div>

            {/* RAM */}
            <div>
              <div className="flex justify-between text-gray-600 mb-1">
                <span>RAM</span>
                <span className="font-semibold text-gray-900">{ramPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, ramPercent))}%` }}
                />
              </div>
            </div>

            {/* Disk */}
            <div>
              <div className="flex justify-between text-gray-600 mb-1">
                <span>Host Storage (Est. 38%)</span>
                <span className="font-semibold text-gray-900">{diskPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-300"
                  style={{ width: `${diskPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
