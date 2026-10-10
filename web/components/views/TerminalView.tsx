"use client";

import React, { useState } from "react";
import { ShieldCheck, Box } from "lucide-react";
import { Project } from "@/types";
import { GraphiteTerminal } from "@/components/terminal/GraphiteTerminal";

interface TerminalViewProps {
  projects: Project[];
  onContainerAction?: (project: Project, action: "start" | "stop" | "restart") => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ projects, onContainerAction }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects.length > 0 ? projects[0].id : ""
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  if (!selectedProject || projects.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Container Terminal</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Interactive shell session inside isolated container application sandbox.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-500 mx-auto flex items-center justify-center">
            <Box className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">No applications deployed</h3>
          <p className="text-xs text-gray-600 max-w-sm mx-auto">
            Deploy an application first to open container terminal access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Container Terminal</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Interactive shell console (/bin/sh) for your running application containers.
          </p>
        </div>

        {/* Security badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Container Sandbox (Host Shell Disabled)</span>
        </div>
      </div>

      {/* Control bar: Project selector & container info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 font-medium">Select Container:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            aria-label="Select container to attach terminal"
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (spanel-app-{p.name}) - {p.status}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-mono">Port: {selectedProject.target_port || 3000}</span>
          <span>•</span>
          <span className="font-mono">{selectedProject.branch || "main"}</span>
        </div>
      </div>

      {/* Terminal Viewport */}
      <GraphiteTerminal
        project={selectedProject}
        onStartContainer={() => onContainerAction?.(selectedProject, "start")}
        className="w-full h-150"
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />
    </div>
  );
};
