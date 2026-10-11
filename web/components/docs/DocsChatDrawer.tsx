"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Send,
  X,
  Bot,
  Copy,
  Check,
  RotateCcw,
  Lightbulb,
} from "lucide-react";
import { askDocsAI } from "@/lib/api";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  provider?: string;
  timestamp: string;
}

interface DocsChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
}

const SUGGESTED_PROMPTS = [
  "Beda Build-time vs Runtime Environment Variables?",
  "Bagaimana cara reset password admin via CLI VPS?",
  "Cara menghubungkan database PostgreSQL ke aplikasi?",
  "Kenapa container saya error atau DOCKER_UNAVAILABLE?",
  "Bagaimana cara mengaktifkan akses Tailscale / IP HTTP?",
];

export const DocsChatDrawer: React.FC<DocsChatDrawerProps> = ({
  isOpen,
  onClose,
  initialQuestion,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Halo! Saya adalah **sPanel Docs AI Assistant**. Tanyakan apa saja seputar deployment aplikasi, konfigurasi database, environment variables, atau troubleshooting Linux VPS Anda.",
      provider: "knowledge_base",
      timestamp: "Baru saja",
    },
  ]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async (questionText?: string) => {
    const textToSend = questionText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: "u-" + Date.now(),
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput("");
    setLoading(true);

    try {
      const res = await askDocsAI(userMsg.text);
      const aiMsg: Message = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: res.ok
          ? res.answer
          : `Maaf, terjadi kendala saat memproses pertanyaan: ${res.error || "Gagal menghubungi server."}`,
        provider: res.provider || "knowledge_base",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "ai-" + Date.now(),
          sender: "ai",
          text: "Terjadi kesalahan jaringan saat menghubungi asisten AI sPanel.",
          provider: "none",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      handleSend(initialQuestion);
    }
  }, [initialQuestion, handleSend]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        sender: "ai",
        text: "Riwayat percakapan telah dibersihkan. Silakan tanyakan hal lain seputar sPanel atau Linux VPS Anda.",
        provider: "knowledge_base",
        timestamp: "Baru saja",
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-115 bg-white border-l border-gray-200/90 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-linear-to-r from-gray-50 via-white to-indigo-50/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900">Ask AI Docs Assistant</h2>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              DevOps & sPanel Knowledge Base Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            title="Bersihkan Percakapan"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompts (Collapsible / Top pills) */}
      <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-100/60 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
        <Lightbulb className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        <span className="text-[11px] font-semibold text-indigo-700 shrink-0">
          Saran:
        </span>
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap bg-white border border-indigo-200/80 text-gray-700 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const isCopied = copiedId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                isUser ? "items-end" : "items-start"
              } space-y-1`}
            >
              <div
                className={`flex items-end gap-2 max-w-[90%] ${
                  isUser ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                    isUser
                      ? "bg-gray-800 text-white"
                      : "bg-indigo-600 text-white shadow-xs"
                  }`}
                >
                  {isUser ? "U" : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-br-xs shadow-xs"
                      : "bg-white border border-gray-200/80 text-gray-800 rounded-bl-xs shadow-xs"
                  }`}
                >
                  {/* Markdown formatted text output */}
                  <div className="space-y-2 whitespace-pre-wrap font-sans">
                    {msg.text}
                  </div>

                  {/* AI Message Footer: Provider & Copy */}
                  {!isUser && (
                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                      <span className="font-mono">
                        {msg.provider === "gemini"
                          ? "✦ Gemini 1.5 Flash"
                          : msg.provider === "openai"
                          ? "✦ GPT-4o Mini"
                          : "✦ sPanel Verified Docs"}
                      </span>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="flex items-center gap-1 hover:text-gray-700 transition cursor-pointer"
                        title="Salin jawaban"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-gray-400 px-9 font-mono">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-xs pl-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-2xl rounded-bl-xs text-xs text-gray-500 flex items-center gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-150" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-300" />
              <span className="ml-1 text-[11px]">Menganalisis dokumentasi...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3.5 border-t border-gray-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Tanyakan apa saja seputar sPanel / VPS..."
            disabled={loading}
            className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition resize-none disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-xs"
            title="Kirim (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
          <span>Tekan Shift+Enter untuk baris baru</span>
          <span className="font-mono">sPanel Docs v1.1.0</span>
        </div>
      </div>
    </div>
  );
};
