import React from "react";
import { Bot } from "lucide-react";

export const AIAssistantView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 border-cyan-500/20 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Autonomous AI Sysadmin (BYOK)</h3>
            <p className="text-xs text-slate-400">
              Menganalisis kegagalan build, menyensor token/secret, dan memberikan PR/1-klik rekomendasi perbaikan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-black/30 p-4 rounded-xl border border-white/5">
            <p className="text-xs text-slate-400">Loop Breaker Guard</p>
            <p className="text-lg font-bold text-emerald-400">Max 3 Retries (Active)</p>
            <p className="text-[11px] text-slate-500 mt-1">Mencegah pemborosan token API saat error berulang.</p>
          </div>
          <div className="bg-black/30 p-4 rounded-xl border border-white/5">
            <p className="text-xs text-slate-400">Remediation Mode</p>
            <p className="text-lg font-bold text-purple-400">Supervised (Safe)</p>
            <p className="text-[11px] text-slate-500 mt-1">Membutuhkan konfirmasi user sebelum menerapkan fix.</p>
          </div>
          <div className="bg-black/30 p-4 rounded-xl border border-white/5">
            <p className="text-xs text-slate-400">Active AI Provider</p>
            <p className="text-lg font-bold text-cyan-400">Google Gemini / OpenAI</p>
            <p className="text-[11px] text-slate-500 mt-1">Kunci API tersimpan dengan enkripsi AES-256-GCM.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
