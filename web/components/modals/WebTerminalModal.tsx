"use client";

import React, { useState } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { Project } from "@/types";
import { GraphiteTerminal } from "@/components/terminal/GraphiteTerminal";

interface WebTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  containerId: string;
  project?: Project | null;
  onStartContainer?: (project: Project) => void;
}

export function WebTerminalModal({
  isOpen,
  onClose,
  title,
  containerId,
  project,
  onStartContainer,
}: WebTerminalModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  // Resolve project or create fallback model
  const activeProject: Project = project || {
    id: containerId.replace(/^spanel-app-/, ""),
    name: containerId.replace(/^spanel-app-/, ""),
    repo_fullname: `local/${containerId}`,
    branch: "main",
    target_port: 3000,
    healthcheck_path: "/",
    status: "running",
    created_at: new Date().toISOString(),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-[#0B1020] border border-[#263244] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized ? "w-full h-full rounded-none" : "w-full max-w-5xl h-[85vh]"
        }`}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#111827] border-b border-[#263244] text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-200">{title || `Container Terminal: ${activeProject.name}`}</span>
            <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
              (Isolated Docker Shell)
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#1E293B] transition cursor-pointer"
              title={isMaximized ? "Restore size" : "Maximize"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#1E293B] transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Component Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden p-2">
          <GraphiteTerminal
            project={activeProject}
            onStartContainer={onStartContainer}
            className="flex-1 w-full"
            isExpanded={isMaximized}
            onToggleExpand={() => setIsMaximized(!isMaximized)}
          />
        </div>
      </div>
    </div>
  );
}
