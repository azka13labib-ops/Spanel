import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Search,
  Copy,
  Check,
  Download,
  ExternalLink,
  ArrowDown,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
} from "lucide-react";

interface DeployLogModalProps {
  isOpen: boolean;
  projectName: string;
  logs: string[];
  onClose: () => void;
  magicDomain?: string;
  customDomain?: string;
}

export const DeployLogModal: React.FC<DeployLogModalProps> = ({
  isOpen,
  projectName,
  logs,
  onClose,
  magicDomain,
  customDomain,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && isOpen) {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll, isOpen]);

  if (!isOpen) return null;

  // Filter logs based on search
  const filteredLogs = searchQuery
    ? logs.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
    : logs;

  // Determine current status
  const isFailed = logs.some((l) => l.includes("❌") || l.includes("Build failed") || l.includes("panic:"));
  const isSuccess = logs.some((l) => l.includes("✅") || l.includes("Build succeeded") || l.includes("Healthy") || l.includes("Container started"));
  const isBuilding = !isFailed && !isSuccess;

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const blob = new Blob([logs.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spanel-${projectName.replace(/\s+/g, "_")}-deploy.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Determine current build stage
  const stages = [
    { label: "Git Clone", done: logs.some((l) => l.includes("cloned successfully") || l.includes("Pulling latest")) },
    { label: "Plan & Inspect", done: logs.some((l) => l.includes("Nixpacks v") || l.includes("Dockerfile")) },
    { label: "Build Image", done: logs.some((l) => l.includes("Running native Docker build") || l.includes("Build succeeded")) },
    { label: "Traefik Proxy", done: logs.some((l) => l.includes("Traefik") || isSuccess) },
    { label: "Ready", done: isSuccess },
  ];

  const appUrl = customDomain ? `http://${customDomain}` : magicDomain ? `http://${magicDomain}` : null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-gray-900 text-white shadow-xs">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">{projectName}</span>
                {/* Status Badge */}
                {isBuilding && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Building
                  </span>
                )}
                {isSuccess && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Success
                  </span>
                )}
                {isFailed && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Failed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Search Filter */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filter logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs rounded-md bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 placeholder-gray-400 w-32 sm:w-44 transition"
              />
            </div>

            {/* Auto-scroll Toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? "Auto-scroll Enabled" : "Auto-scroll Paused"}
              className={`p-1.5 rounded-md border text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                autoScroll
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-100"
              }`}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>

            {/* Copy Logs */}
            <button
              onClick={handleCopyLogs}
              title="Copy all logs"
              className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 transition cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>

            {/* Download Log */}
            <button
              onClick={handleDownloadLogs}
              title="Download full log file"
              className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
            </button>

            {/* Open App Link if Succeeded */}
            {isSuccess && appUrl && (
              <a
                href={appUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition shadow-xs"
              >
                <span>Open App</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition cursor-pointer ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stage Progress Bar (for build logs) */}
        <div className="px-5 py-2 bg-gray-100/70 border-b border-gray-200 flex items-center justify-between text-xs overflow-x-auto gap-2">
          {stages.map((stage, i) => (
            <div key={i} className="flex items-center gap-1.5 shrink-0">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  stage.done
                    ? "bg-emerald-600 text-white"
                    : isBuilding && i === stages.findIndex((s) => !s.done)
                    ? "bg-indigo-600 text-white animate-pulse"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {stage.done ? "✓" : i + 1}
              </span>
              <span
                className={`font-medium ${
                  stage.done
                    ? "text-gray-900"
                    : isBuilding && i === stages.findIndex((s) => !s.done)
                    ? "text-indigo-600 font-semibold"
                    : "text-gray-400"
                }`}
              >
                {stage.label}
              </span>
              {i < stages.length - 1 && <span className="text-gray-300 select-none ml-2">→</span>}
            </div>
          ))}
        </div>

        {/* Terminal Window */}
        <div
          ref={terminalContainerRef}
          className="p-4 bg-gray-950 font-mono text-xs text-gray-200 overflow-y-auto space-y-1 flex-1 min-h-[380px] max-h-[550px] selection:bg-indigo-800 selection:text-white"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>{searchQuery ? "No log lines match your filter" : "Waiting for log stream..."}</p>
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              // Color formatting helpers
              const isErr = log.includes("❌") || log.toLowerCase().includes("error") || log.toLowerCase().includes("failed") || log.includes("panic:");
              const isOk = log.includes("✓") || log.includes("✅") || log.includes("successfully") || log.includes("DONE") || log.includes("active!");
              const isStep = log.startsWith("#") || log.includes("[stage-0");
              const isHeader = log.startsWith("===") || log.includes("🚀");

              return (
                <div key={idx} className="flex items-start hover:bg-gray-900/70 py-0.5 px-1 rounded transition-colors group">
                  <span className="text-gray-600 select-none w-10 shrink-0 text-right pr-3 font-mono text-[11px] group-hover:text-gray-400">
                    {idx + 1}
                  </span>
                  <span
                    className={`leading-relaxed break-all flex-1 ${
                      isErr
                        ? "text-rose-400 font-medium"
                        : isOk
                        ? "text-emerald-400 font-medium"
                        : isStep
                        ? "text-sky-300"
                        : isHeader
                        ? "text-indigo-400 font-bold"
                        : "text-gray-300"
                    }`}
                  >
                    {log}
                  </span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span>
              Lines: <strong className="text-gray-700">{filteredLogs.length}</strong>
              {searchQuery && ` (filtered from ${logs.length})`}
            </span>
            {isBuilding && (
              <span className="flex items-center gap-1.5 text-indigo-600">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping" />
                Live streaming
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-[11px]">Press Esc or Click Outside to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
