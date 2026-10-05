import React from "react";
import { Layers, Plus, Cpu, Server } from "lucide-react";
import { SystemMetrics } from "@/types";

interface NavbarProps {
  metrics: SystemMetrics;
  onOpenNewProject: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ metrics, onOpenNewProject }) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-indigo-600 flex items-center justify-center text-white">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 tracking-tight">sPanel</span>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <Cpu className="h-4 w-4" />
          <span>{metrics.num_cpu} Cores</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Server className="h-4 w-4" />
          <span>{metrics.alloc_mb} MB RAM</span>
        </div>
      </div>

      <button
        onClick={onOpenNewProject}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition"
      >
        <Plus className="h-4 w-4" />
        <span>New Project</span>
      </button>
    </header>
  );
};
