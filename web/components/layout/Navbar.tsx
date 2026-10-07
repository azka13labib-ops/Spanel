import React, { useState } from "react";
import { Layers, Plus, Cpu, Server, Globe, Check, Copy } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { SystemMetrics, GitHubStatus } from "@/types";

interface NavbarProps {
  metrics: SystemMetrics;
  githubStatus?: GitHubStatus | null;
  onOpenNewProject: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ metrics, githubStatus, onOpenNewProject }) => {
  const [copiedIP, setCopiedIP] = useState(false);

  const handleCopyIP = () => {
    if (metrics.host_ip) {
      navigator.clipboard.writeText(metrics.host_ip);
      setCopiedIP(true);
      setTimeout(() => setCopiedIP(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200/90 px-5 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs font-bold text-sm">
          <Layers className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-gray-900 tracking-tight">sPanel</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            PaaS
          </span>
        </div>
      </div>

      {/* System Resource Metrics */}
      <div className="hidden md:flex items-center gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200/70" title="CPU Cores Available">
          <Cpu className="h-3.5 w-3.5 text-gray-400" />
          <span>{metrics.num_cpu} Cores</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200/70" title="System Memory Allocated">
          <Server className="h-3.5 w-3.5 text-gray-400" />
          <span>{metrics.alloc_mb} MB RAM</span>
        </div>
        {metrics.host_ip && (
          <button
            onClick={handleCopyIP}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200/70 hover:bg-gray-100 text-gray-600 transition cursor-pointer"
            title="Click to copy Server Public/Host IP"
          >
            <Globe className="h-3.5 w-3.5 text-indigo-500" />
            <span className="font-mono text-[11px]">{metrics.host_ip}</span>
            {copiedIP ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-gray-400" />}
          </button>
        )}
      </div>

      {/* Right Side: GitHub Status & New Project Button */}
      <div className="flex items-center gap-3">
        {githubStatus?.connected ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <GithubIcon className="h-3.5 w-3.5" />
            <span>@{githubStatus.username || "connected"}</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-gray-500 text-xs">
            <GithubIcon className="h-3.5 w-3.5 text-gray-400" />
            <span>GitHub Standby</span>
          </div>
        )}

        <button
          onClick={onOpenNewProject}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer active:scale-98"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Project</span>
        </button>
      </div>
    </header>
  );
};
