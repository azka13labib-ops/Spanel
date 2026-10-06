"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Terminal as TerminalIcon, Maximize2, Minimize2, Trash2, CornerDownLeft } from "lucide-react";
import { getWebSocketUrl } from "@/lib/api";

interface WebTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  containerId: string;
}

export function WebTerminalModal({
  isOpen,
  onClose,
  title,
  containerId,
}: WebTerminalModalProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isConnected, setIsConnected] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen || !containerId) return;

    const wsUrl = getWebSocketUrl(`/ws/terminal/${encodeURIComponent(containerId)}`);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setLogs((prev) => [
        ...prev,
        `✓ Connected to ${containerId}! Interactive /bin/sh ready.`,
      ]);
      inputRef.current?.focus();
    };

    ws.onmessage = async (event) => {
      let text = "";
      if (event.data instanceof Blob) {
        text = await event.data.text();
      } else {
        text = String(event.data);
      }
      setLogs((prev) => [...prev, text]);
    };

    ws.onerror = () => {
      setLogs((prev) => [...prev, `❌ Connection error. Ensure container is active.`]);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setLogs((prev) => [...prev, `[Disconnected from shell]`]);
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [isOpen, containerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!isOpen) return null;

  const handleSendCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    const cmd = inputVal.trimEnd();
    socketRef.current.send(cmd + "\n");
    if (cmd.trim()) {
      setHistory((prev) => [cmd, ...prev]);
      setHistoryIndex(-1);
    }
    setInputVal("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal("");
      }
    }
  };

  const clearTerminal = () => {
    setLogs([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isMaximized ? "w-full h-full rounded-none" : "w-full max-w-4xl h-162.5"
        }`}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 cursor-pointer" onClick={onClose} />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-2 text-sm font-mono text-zinc-300">
              <TerminalIcon className="w-4 h-4 text-emerald-400" />
              <span>{title}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-sans ${
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={clearTerminal}
              title="Clear Terminal"
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore size" : "Maximize"}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Output Area */}
        <div
          className="flex-1 p-4 bg-zinc-950 font-mono text-xs text-zinc-300 overflow-y-auto whitespace-pre-wrap select-text selection:bg-emerald-500/30"
          onClick={() => inputRef.current?.focus()}
        >
          {logs.length === 0 ? (
            <div className="text-zinc-600">Connecting to container shell...</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="leading-relaxed">
                {log}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendCommand}
          className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-t border-zinc-800"
        >
          <span className="text-emerald-400 font-mono text-sm select-none">$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Ketik perintah (e.g. ls -la, top, env, ps aux)..." : "Connecting..."}
            disabled={!isConnected}
            className="flex-1 bg-transparent text-zinc-100 font-mono text-sm placeholder-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!isConnected || !inputVal.trim()}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <span>Send</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
