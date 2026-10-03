import React from "react";
import { ShieldCheck } from "lucide-react";

export const ServerHygieneView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <div>
              <h3 className="font-bold text-lg">VPS Auto-Janitor & Hygiene</h3>
              <p className="text-xs text-slate-400">Pembersih cache otomatis berjalan via Goroutine Cron internal.</p>
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            Scheduled: 03:00 AM Daily
          </span>
        </div>

        <div className="bg-black/40 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2 border border-white/5">
          <p className="text-slate-500">{"// Janitor command executed automatically:"}</p>
          <p className="text-cyan-300">docker image prune -af --filter &quot;until=168h&quot;</p>
          <p className="text-emerald-400">✓ SQLite WAL Checkpointed safely (0 locked writes)</p>
          <p className="text-slate-400">✓ Log retention policy: Purge stderr archives &gt; 30 days</p>
        </div>
      </div>
    </div>
  );
};
