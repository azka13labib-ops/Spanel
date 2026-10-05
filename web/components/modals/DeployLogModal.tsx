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
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl overflow-hidden shadow-xl border border-gray-200 flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-gray-700" />
            <span className="font-semibold text-sm text-gray-900">Live Build Stream: {projectName}</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 transition text-gray-600 font-medium cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>
        <div className="p-4 bg-gray-900 font-mono text-xs text-gray-300 overflow-y-auto space-y-1.5 flex-1 min-h-75">
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
