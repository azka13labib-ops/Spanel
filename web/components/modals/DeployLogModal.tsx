import React from "react";
import { Terminal } from "lucide-react";

interface DeployLogModalProps {
  isOpen: boolean;
  projectName: string;
  logs: string[];
  onClose: () => void;
}

export const DeployLogModal: React.FC<DeployLogModalProps> = ({
  isOpen,
  projectName,
  logs,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl w-full max-w-3xl overflow-hidden border-cyan-500/30 flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyan-400" />
            <span className="font-bold text-sm text-white">Live Build Stream: {projectName}</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition text-slate-300 cursor-pointer"
          >
            Close
          </button>
        </div>
        <div className="p-4 bg-[#05070a] font-mono text-xs text-slate-300 overflow-y-auto space-y-1.5 flex-1 min-h-75">
          {logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              <span className="text-slate-600 select-none mr-3">{idx + 1}</span>
              <span
                className={
                  log.includes("✅")
                    ? "text-emerald-400 font-bold"
                    : log.includes("[Traefik]")
                    ? "text-purple-400"
                    : ""
                }
              >
                {log}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
