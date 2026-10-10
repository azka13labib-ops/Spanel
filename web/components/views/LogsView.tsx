import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Trash2,
  ArrowDown,
  Terminal,
} from "lucide-react";
import { Project } from "@/types";
import { getWebSocketUrl } from "@/lib/api";

interface LogsViewProps {
  projects: Project[];
  onOpenTerminal?: (project: Project) => void;
}

export const LogsView: React.FC<LogsViewProps> = ({ projects, onOpenTerminal }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects.length > 0 ? projects[0].id : ""
  );
  const [logType, setLogType] = useState<"app" | "container">("app");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [logs, setLogs] = useState<string[]>(() => {
    const host = typeof window !== "undefined" ? window.location.host : "sPanel Host";
    return [
      "[SYS] Connecting to sPanel live runtime log stream...",
      `[SYS] Host Connection: ${host}`,
    ];
  });

  const logEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  useEffect(() => {
    if (!selectedProject) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const initialTimer = setTimeout(() => {
      setLogs([
        `[SYS] Streaming logs for ${selectedProject.name} (${logType === "app" ? "Application" : "Container"})...`,
      ]);
    }, 0);

    const path =
      logType === "app"
        ? `/ws/runtime-logs/${selectedProject.id}`
        : `/ws/logs/${selectedProject.id}`;

    const wsUrl = getWebSocketUrl(path);
    if (!wsUrl) return;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        if (event.data) {
          const lines = event.data.split("\n").filter((l: string) => l.trim().length > 0);
          setLogs((prev) => {
            const next = [...prev, ...lines];
            if (next.length > 500) return next.slice(next.length - 500);
            return next;
          });
        }
      };

      ws.onerror = () => {
        setLogs((prev) => [...prev, `[SYS] Log stream standby (container idle).`]);
      };
    } catch {}

    return () => {
      clearTimeout(initialTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedProject, logType]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((l) =>
    search ? l.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Logs Stream</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Real-time streaming console output from your applications and container workloads.
          </p>
        </div>

        {/* Actions & Live Badge */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {onOpenTerminal && selectedProject && (
            <button
              onClick={() => onOpenTerminal(selectedProject)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
              title="Open interactive shell terminal container"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Open Interactive Terminal</span>
            </button>
          )}

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Stream</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Project Selector & Log Type Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              aria-label="Select application to stream logs"
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-medium text-gray-600">
            <button
              onClick={() => setLogType("app")}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                logType === "app" ? "bg-white text-gray-900 font-semibold shadow-2xs" : "hover:text-gray-900"
              }`}
            >
              Application Logs
            </button>
            <button
              onClick={() => setLogType("container")}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                logType === "container" ? "bg-white text-gray-900 font-semibold shadow-2xs" : "hover:text-gray-900"
              }`}
            >
              Container Logs
            </button>
          </div>
        </div>

        {/* Search, Clear & AutoScroll */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter logs..."
              aria-label="Filter logs"
              className="w-full pl-8 pr-2.5 py-1.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border text-xs font-medium transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none ${
              autoScroll
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
            title={autoScroll ? "Auto-scroll enabled" : "Auto-scroll disabled"}
            aria-label={autoScroll ? "Disable auto-scroll" : "Enable auto-scroll"}
          >
            <ArrowDown className="w-4 h-4" />
          </button>

          <button
            onClick={() => setLogs([])}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-rose-600 hover:bg-gray-50 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
            title="Clear logs"
            aria-label="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Console Box */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col h-130">
        {/* Terminal Header */}
        <div className="px-4 py-2.5 bg-gray-900/90 border-b border-gray-800 flex items-center justify-between text-xs text-gray-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="ml-2 font-medium text-gray-300">
              {selectedProject?.name || "app"}:stdout
            </span>
          </div>
          <span>{filteredLogs.length} lines</span>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-gray-200 space-y-1 select-text">
          {filteredLogs.length === 0 ? (
            <p className="text-gray-500 italic">No log lines recorded.</p>
          ) : (
            filteredLogs.map((line, idx) => {
              const isError = line.includes("ERR") || line.includes("Error") || line.includes("failed");
              const isWarn = line.includes("WARN") || line.includes("Warning");
              const isSys = line.startsWith("[SYS]");

              return (
                <div key={idx} className="flex items-start gap-3 hover:bg-white/5 py-0.5 px-1 rounded">
                  <span className="text-gray-500 text-[10px] select-none w-8 text-right shrink-0">
                    {idx + 1}
                  </span>
                  <span
                    className={`break-all leading-relaxed ${
                      isError
                        ? "text-rose-400 font-semibold"
                        : isWarn
                        ? "text-amber-400"
                        : isSys
                        ? "text-sky-400"
                        : "text-gray-300"
                    }`}
                  >
                    {line}
                  </span>
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};
