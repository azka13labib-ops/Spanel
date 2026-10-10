"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import "@xterm/xterm/css/xterm.css";
import {
  Terminal as TerminalIcon,
  RefreshCw,
  Trash2,
  Copy,
  Maximize2,
  Minimize2,
  AlertCircle,
  Play,
  Check,
  Shield,
  Layers,
} from "lucide-react";
import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { Project } from "@/types";
import { getWebSocketUrl } from "@/lib/api";

export interface GraphiteTerminalProps {
  project: Project;
  onStartContainer?: (project: Project) => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Graphite + Muted Indigo Theme Tokens
const GRAPHITE_THEME = {
  background: "#0B1020",
  foreground: "#E5E7EB",
  cursor: "#818CF8",
  cursorAccent: "#0B1020",
  selectionBackground: "#818CF833",
  selectionForeground: "#FFFFFF",
  black: "#111827",
  red: "#F87171",
  green: "#34D399",
  yellow: "#FBBF24",
  blue: "#818CF8",
  magenta: "#C084FC",
  cyan: "#67E8F9",
  white: "#E5E7EB",
  brightBlack: "#4B5563",
  brightRed: "#FCA5A5",
  brightGreen: "#6EE7B7",
  brightYellow: "#FDE047",
  brightBlue: "#A5B4FC",
  brightMagenta: "#E9D5FF",
  brightCyan: "#A5F3FC",
  brightWhite: "#F9FAFB",
};

export const GraphiteTerminal: React.FC<GraphiteTerminalProps> = ({
  project,
  onStartContainer,
  className = "",
  isExpanded = false,
  onToggleExpand,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "stopped" | "error"
  >("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(13);
  const [dimensions, setDimensions] = useState<{ cols: number; rows: number }>({ cols: 80, rows: 24 });
  const [copied, setCopied] = useState(false);
  const isStopped = project.status !== "running";

  const containerID = `spanel-app-${project.name}`;

  // Initialize and connect WebSocket + xterm
  const initTerminal = useCallback(async () => {
    if (!containerRef.current) return;
    if (isStopped) {
      setConnectionStatus("stopped");
      return;
    }

    setConnectionStatus("connecting");
    setErrorMessage(null);

    // Dynamically import xterm to avoid SSR issues
    const { Terminal } = await import("@xterm/xterm");
    const { FitAddon } = await import("@xterm/addon-fit");

    // Clean up previous instance if any
    if (termRef.current) {
      termRef.current.dispose();
      termRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
      theme: GRAPHITE_THEME,
      allowTransparency: true,
      convertEol: true,
      scrollback: 2000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    containerRef.current.innerHTML = "";
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    const initialCols = term.cols || 80;
    const initialRows = term.rows || 24;
    setDimensions({ cols: initialCols, rows: initialRows });

    // Connect WebSocket
    const wsUrl = getWebSocketUrl(`/ws/terminal/${encodeURIComponent(project.id || project.name)}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      // Send initial dimensions
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
      term.focus();
    };

    ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        const buffer = await event.data.arrayBuffer();
        term.write(new Uint8Array(buffer));
      } else {
        term.write(String(event.data));
      }
    };

    ws.onerror = () => {
      setConnectionStatus("error");
      setErrorMessage("Koneksi terminal gagal. Pastikan container aktif dan port WebSocket dapat diakses.");
    };

    ws.onclose = (event) => {
      setConnectionStatus("disconnected");
      if (event.code !== 1000) {
        term.writeln("\r\n\x1b[90m[Session disconnected]\x1b[0m");
      }
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    term.onResize(({ cols, rows }) => {
      setDimensions({ cols, rows });
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    });
  }, [project.id, project.name, isStopped, fontSize]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        initTerminal();
      }
    });

    return () => {
      ignore = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
    };
  }, [initTerminal]);

  // Window resize observer to fit terminal
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && termRef.current) {
        try {
          fitAddonRef.current.fit();
          setDimensions({ cols: termRef.current.cols, rows: termRef.current.rows });
        } catch {}
      }
    };

    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 150);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [isExpanded]);

  // Update font size dynamically
  const handleChangeFontSize = (delta: number) => {
    const newSize = Math.min(18, Math.max(11, fontSize + delta));
    setFontSize(newSize);
    if (termRef.current) {
      termRef.current.options.fontSize = newSize;
      setTimeout(() => fitAddonRef.current?.fit(), 50);
    }
  };

  const handleClear = () => {
    if (termRef.current) {
      termRef.current.clear();
      termRef.current.focus();
    }
  };

  const handleCopySelection = () => {
    if (termRef.current) {
      const selection = termRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleReconnect = () => {
    initTerminal();
  };

  return (
    <div
      className={`flex flex-col bg-[#0B1020] border border-[#263244] rounded-xl overflow-hidden font-mono shadow-xl transition-all duration-200 ${className}`}
    >
      {/* Terminal Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#111827] border-b border-[#263244] text-xs">
        {/* Left identity details */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-[#263244]">
            <TerminalIcon className="w-3.5 h-3.5 text-[#818CF8]" />
            <span className="font-semibold text-[#E5E7EB]">{project.name}</span>
            <span className="text-[#9CA3AF] text-[11px]">/</span>
            <span className="text-[#9CA3AF] text-[11px] truncate max-w-40" title={containerID}>
              {containerID}
            </span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1E293B] border border-[#334155] text-[10px] text-[#67E8F9]">
            <Shield className="w-3 h-3 text-[#67E8F9]" />
            <span>Container Shell</span>
          </div>
        </div>

        {/* Right status & toolbar */}
        <div className="flex items-center gap-2">
          {/* Status pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1E293B] border border-[#334155] text-[11px]">
            {connectionStatus === "connected" && (
              <>
                <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
                <span className="text-[#34D399] font-medium">Connected</span>
              </>
            )}
            {connectionStatus === "connecting" && (
              <>
                <RefreshCw className="w-3 h-3 text-[#FBBF24] animate-spin" />
                <span className="text-[#FBBF24]">Connecting...</span>
              </>
            )}
            {connectionStatus === "disconnected" && (
              <>
                <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
                <span className="text-[#9CA3AF]">Disconnected</span>
              </>
            )}
            {connectionStatus === "stopped" && (
              <>
                <span className="w-2 h-2 rounded-full bg-[#F87171]" />
                <span className="text-[#F87171]">Container Stopped</span>
              </>
            )}
            {connectionStatus === "error" && (
              <>
                <span className="w-2 h-2 rounded-full bg-[#F87171]" />
                <span className="text-[#F87171]">Error</span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <button
            onClick={handleCopySelection}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1E293B] transition cursor-pointer"
            title="Copy selected text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1E293B] transition cursor-pointer"
            title="Clear terminal screen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center border border-[#263244] rounded-lg overflow-hidden bg-[#1E293B]/60 text-[11px]">
            <button
              onClick={() => handleChangeFontSize(-1)}
              className="px-2 py-1 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1E293B] transition cursor-pointer"
              title="Decrease font size"
            >
              A-
            </button>
            <span className="px-1.5 py-1 text-[#9CA3AF] text-[10px] border-x border-[#263244]">
              {fontSize}px
            </span>
            <button
              onClick={() => handleChangeFontSize(1)}
              className="px-2 py-1 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1E293B] transition cursor-pointer"
              title="Increase font size"
            >
              A+
            </button>
          </div>

          <button
            onClick={handleReconnect}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1E293B] transition cursor-pointer"
            title="Reconnect terminal"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1E293B] transition cursor-pointer"
              title={isExpanded ? "Restore size" : "Maximize view"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="relative flex-1 bg-[#0B1020] min-h-96">
        {/* Stopped Container Overlay */}
        {isStopped ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-[#0B1020]/95 backdrop-blur-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#FBBF24]">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-sm font-semibold text-[#E5E7EB]">Aplikasi Sedang Tidak Berjalan</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Container <code className="text-[#818CF8] bg-[#111827] px-1.5 py-0.5 rounded">{containerID}</code> dalam keadaan berhenti. Jalankan aplikasi terlebih dahulu untuk membuka sesi interaktif shell.
              </p>
            </div>
            {onStartContainer && (
              <button
                onClick={() => onStartContainer(project)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Application</span>
              </button>
            )}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="w-full h-full p-3 overflow-hidden select-text"
            onClick={() => termRef.current?.focus()}
          />
        )}

        {/* Error notification banner */}
        {errorMessage && connectionStatus === "error" && (
          <div className="absolute bottom-4 left-4 right-4 z-20 p-3 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={handleReconnect}
              className="px-2.5 py-1 rounded bg-rose-900 hover:bg-rose-800 text-white text-[11px] font-semibold transition cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>

      {/* Terminal Footer Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#111827] border-t border-[#263244] text-[11px] text-[#9CA3AF]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#818CF8]" />
            <span>Image: spanel/{project.name}:latest</span>
          </span>
          <span className="hidden sm:inline">Port: {project.target_port || 3000}</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>{dimensions.cols}x{dimensions.rows}</span>
          <span className="px-1.5 py-0.2 rounded bg-[#1E293B] border border-[#334155] text-[#818CF8]">
            sh / bash
          </span>
        </div>
      </div>
    </div>
  );
};
