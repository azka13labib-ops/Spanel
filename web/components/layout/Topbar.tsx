import React, { useState } from "react";
import {
  Search,
  Bell,
  Plus,
  Menu,
  Globe,
  Check,
  Copy,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { SystemMetrics, VersionInfo, Project, DashboardTab } from "@/types";

interface TopbarProps {
  metrics: SystemMetrics;
  projects?: Project[];
  onNavigate?: (tab: DashboardTab) => void;
  onContainerAction?: (project: Project, action: "start" | "stop" | "restart") => void;
  onViewLogs?: (project: Project) => void;
  onOpenNewProject: () => void;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLogout?: () => void;
  versionInfo?: VersionInfo | null;
  onOpenUpdateModal?: () => void;
}

interface ServerAnomaly {
  id: string;
  level: "critical" | "warning";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  metrics,
  projects = [],
  onNavigate,
  onContainerAction,
  onViewLogs,
  onOpenNewProject,
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  onLogout,
  versionInfo,
  onOpenUpdateModal,
}) => {
  const [copiedIP, setCopiedIP] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleCopyIP = () => {
    if (metrics.host_ip) {
      navigator.clipboard.writeText(metrics.host_ip);
      setCopiedIP(true);
      setTimeout(() => setCopiedIP(false), 2000);
    }
  };

  // Dynamic Real-Time Server Anomaly Detection
  const cpuPct = metrics.host_cpu_percent ?? 0;
  const ramPct = metrics.host_ram_percent ?? 0;

  const anomalies: ServerAnomaly[] = [];

  // 1. High CPU Anomaly
  if (cpuPct >= 90) {
    anomalies.push({
      id: "cpu-critical",
      level: "critical",
      title: `Beban CPU Kritis (${Math.round(cpuPct)}%)`,
      description: `Beban pemrosesan host hampir mencapai batas maksimal (${metrics.num_cpu} Core).`,
      actionLabel: "Monitoring",
      onAction: () => onNavigate?.("monitoring"),
    });
  } else if (cpuPct >= 85) {
    anomalies.push({
      id: "cpu-warning",
      level: "warning",
      title: `Penggunaan CPU Tinggi (${Math.round(cpuPct)}%)`,
      description: `Beban CPU meningkat signifikan di atas ambang batas 85%.`,
      actionLabel: "Monitoring",
      onAction: () => onNavigate?.("monitoring"),
    });
  }

  // 2. High RAM Anomaly
  if (ramPct >= 90) {
    anomalies.push({
      id: "ram-critical",
      level: "critical",
      title: `Memori RAM Kritis (${Math.round(ramPct)}%)`,
      description: `Kapasitas RAM host tersisa sangat sedikit (${Math.round(metrics.host_used_ram_mb ?? 0)} MB / ${Math.round(metrics.host_total_ram_mb ?? 0)} MB).`,
      actionLabel: "Monitoring",
      onAction: () => onNavigate?.("monitoring"),
    });
  } else if (ramPct >= 85) {
    anomalies.push({
      id: "ram-warning",
      level: "warning",
      title: `Penggunaan RAM Tinggi (${Math.round(ramPct)}%)`,
      description: `Kapasitas RAM host terpakai lebih dari 85%.`,
      actionLabel: "Monitoring",
      onAction: () => onNavigate?.("monitoring"),
    });
  }

  // 3. Stopped or Crashed Container Anomaly
  projects.forEach((p) => {
    if (p.status !== "running" && p.status !== "building") {
      anomalies.push({
        id: `stopped-${p.id}`,
        level: "warning",
        title: `Container ${p.name} Berhenti`,
        description: `Container spanel-app-${p.name} dalam status "${p.status}". Aplikasi tidak dapat melayani request.`,
        actionLabel: "Start",
        onAction: () => onContainerAction?.(p, "start"),
        secondaryActionLabel: "Logs",
        onSecondaryAction: () => onViewLogs?.(p),
      });
    }
  });

  const runningCount = projects.filter((p) => p.status === "running").length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu Toggle & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 lg:hidden cursor-pointer"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search applications, repositories, or containers..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9.5 pr-4 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Right Controls: Host IP, Dynamic Notifications, User Menu, Update Button, Deploy Action */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {metrics.host_ip && (
          <button
            onClick={handleCopyIP}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 transition text-xs font-mono cursor-pointer"
            title="Click to copy Server Public/Host IP"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>{metrics.host_ip}</span>
            {copiedIP ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400" />
            )}
          </button>
        )}

        {/* Dynamic Server Anomalies Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
            title={anomalies.length > 0 ? `${anomalies.length} anomali server terdeteksi` : "Semua server normal"}
          >
            <Bell className={`w-4 h-4 ${anomalies.length > 0 ? "text-rose-600" : "text-gray-500"}`} />
            {anomalies.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-xs">
                {anomalies.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-2xl p-3.5 z-50 text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {anomalies.length > 0 ? "Anomali & Alert Server" : "Status Kesehatan Server"}
                  </span>
                  {anomalies.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                      {anomalies.length} Masalah
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                  {anomalies.length > 0 ? "Perlu Tindakan" : "All Healthy"}
                </span>
              </div>

              {anomalies.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                  {anomalies.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 ${
                        item.level === "critical"
                          ? "bg-rose-50/80 border-rose-200 text-rose-950"
                          : "bg-amber-50/80 border-amber-200 text-amber-950"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            item.level === "critical" ? "text-rose-600" : "text-amber-600"
                          }`}
                        />
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs leading-snug">{item.title}</p>
                          <p className="text-[11px] text-gray-600 leading-relaxed">{item.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-center">
                        {item.secondaryActionLabel && item.onSecondaryAction && (
                          <button
                            onClick={() => {
                              setShowNotifications(false);
                              item.onSecondaryAction!();
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                          >
                            {item.secondaryActionLabel}
                          </button>
                        )}
                        {item.actionLabel && item.onAction && (
                          <button
                            onClick={() => {
                              setShowNotifications(false);
                              item.onAction!();
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-2xs whitespace-nowrap ${
                              item.level === "critical"
                                ? "bg-rose-600 hover:bg-rose-700 text-white"
                                : "bg-amber-600 hover:bg-amber-700 text-white"
                            }`}
                          >
                            {item.actionLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-emerald-950">Semua Layanan Berjalan Normal</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      CPU {Math.round(cpuPct)}% • RAM {Math.round(ramPct)}% • Container ({runningCount}/{projects.length} Active). Tidak ada anomali terdeteksi.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Administrator Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 sm:px-2 sm:py-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold text-gray-900 leading-tight">admin</span>
              <span className="text-[10px] text-gray-400 leading-tight">Administrator</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl p-1 z-50 text-xs animate-in fade-in">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="font-medium text-gray-900">Signed in as admin</p>
                <p className="text-[10px] text-gray-400 font-mono">100.125.7.123</p>
              </div>

              {onOpenUpdateModal && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenUpdateModal();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-md transition flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Cek Pembaruan</span>
                  </span>
                  {versionInfo?.has_update && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  if (onLogout) onLogout();
                  else {
                    localStorage.removeItem("spanel_token");
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer font-medium mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Update Button with Dynamic Dot Indicator */}
        {onOpenUpdateModal && (
          <button
            onClick={onOpenUpdateModal}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer shadow-2xs ${
              versionInfo?.has_update
                ? "bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
            title={versionInfo?.has_update ? `Pembaruan sPanel ${versionInfo.latest_version} tersedia!` : "Periksa Pembaruan sPanel"}
          >
            {versionInfo?.has_update ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            ) : null}
            <Sparkles className={`w-3.5 h-3.5 ${versionInfo?.has_update ? "text-indigo-600" : "text-gray-400"}`} />
            <span className="hidden sm:inline">
              {versionInfo?.has_update ? `Update ${versionInfo.latest_version || "Tersedia"}` : "Cek Update"}
            </span>
            <span className="sm:hidden">Update</span>
          </button>
        )}

        {/* Primary Action Button */}
        <button
          onClick={onOpenNewProject}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer active:scale-98"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Deploy Application</span>
          <span className="sm:hidden">Deploy</span>
        </button>
      </div>
    </header>
  );
};
