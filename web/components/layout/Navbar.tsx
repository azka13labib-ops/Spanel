import React from "react";
import { Layers, Plus, Cpu, Server, Activity } from "lucide-react";
import { SystemMetrics } from "@/types";

interface NavbarProps {
  metrics: SystemMetrics;
  onOpenNewProject: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ metrics, onOpenNewProject }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07090e]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-linear-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Layers className="h-5 w-5 text-black" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight bg-linear-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
              sPanel
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Single-Binary PaaS
            </span>
          </div>
          <p className="text-xs text-slate-400">Zero-Config AI-Powered Self-Hosted Cloud</p>
        </div>
      </div>

      {/* System Stats Ticker */}
      <div className="hidden md:flex items-center gap-6 text-xs text-slate-400 bg-slate-900/60 border border-white/5 rounded-full px-5 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-300 font-medium">SQLite WAL Active</span>
        </div>
        <div className="h-3 w-px bg-white/10"></div>
        <div className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-cyan-400" />
          <span>{metrics.num_cpu} Cores</span>
        </div>
        <div className="h-3 w-px bg-white/10"></div>
        <div className="flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5 text-purple-400" />
          <span>RAM: {metrics.alloc_mb} MB</span>
        </div>
        <div className="h-3 w-px bg-white/10"></div>
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          <span>Goroutines: {metrics.goroutines}</span>
        </div>
      </div>

      <button
        onClick={onOpenNewProject}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 text-black font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:opacity-95 transition active:scale-95 cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        <span>New Project</span>
      </button>
    </header>
  );
};
