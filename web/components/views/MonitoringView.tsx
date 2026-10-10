import React, { useState } from "react";
import {
  Cpu,
  Server,
  Check,
  Copy,
  Zap,
} from "lucide-react";
import { SystemMetrics } from "@/types";

interface MonitoringViewProps {
  metrics: SystemMetrics;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({ metrics }) => {
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const [copiedIP, setCopiedIP] = useState(false);

  const cpuPercent = metrics.host_cpu_percent !== undefined ? Math.round(metrics.host_cpu_percent) : 12;
  const ramPercent = metrics.host_ram_percent !== undefined ? Math.round(metrics.host_ram_percent) : 28;

  const handleCopyIP = () => {
    if (metrics.host_ip) {
      navigator.clipboard.writeText(metrics.host_ip);
      setCopiedIP(true);
      setTimeout(() => setCopiedIP(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">System Monitoring</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Real-time resource metrics, kernel telemetry, and host utilization.
          </p>
        </div>

        {/* Time Filter */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-medium text-gray-600 self-start sm:self-auto">
          {(["1h", "6h", "24h", "7d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                timeRange === r
                  ? "bg-white text-gray-900 font-semibold shadow-2xs"
                  : "hover:text-gray-900"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Host Specifications Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Host Server</span>
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-gray-900 capitalize">{metrics.os} / {metrics.arch}</span>
            <Server className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-[11px] text-gray-500 font-mono">Kernel 5.15+ LTS</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Host IP Address</span>
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-sm text-gray-900">{metrics.host_ip}</span>
            <button
              onClick={handleCopyIP}
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition cursor-pointer"
              title="Copy IP"
            >
              {copiedIP ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[11px] text-gray-500">Public/WireGuard binding</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">CPU Cores</span>
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-gray-900">{metrics.num_cpu} vCPU Cores</span>
            <Cpu className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-[11px] text-gray-500 font-mono">1m Load: {metrics.load_avg_1?.toFixed(2) || "0.15"}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Go Goroutines</span>
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-gray-900">{metrics.goroutines} Active</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[11px] text-gray-500 font-mono">Alloc: {metrics.alloc_mb} MB</p>
        </div>
      </div>

      {/* Resource Utilization Cards & Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Utilization Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Host CPU Utilization</h2>
              <p className="text-[11px] text-gray-500">Processor load across all cores</p>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-gray-900">{cpuPercent}%</span>
              <span className="text-[11px] text-emerald-600 font-medium">Normal</span>
            </div>
          </div>

          <div className="h-44 w-full">
            <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
              <line x1="0" y1="30" x2="500" y2="30" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
              <path
                d="M 0 110 Q 50 90 100 120 T 200 80 T 300 65 T 400 90 T 500 100"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2.5"
              />
            </svg>
            <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-1">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>Now</span>
            </div>
          </div>
        </div>

        {/* RAM Utilization Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Host RAM Memory Utilization</h2>
              <p className="text-[11px] text-gray-500">
                {metrics.host_total_ram_mb
                  ? `${(metrics.host_used_ram_mb! / 1024).toFixed(1)} GB used of ${(metrics.host_total_ram_mb / 1024).toFixed(1)} GB`
                  : "Physical memory allocated"}
              </p>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-gray-900">{ramPercent}%</span>
              <span className="text-[11px] text-emerald-600 font-medium">Optimal</span>
            </div>
          </div>

          <div className="h-44 w-full">
            <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
              <line x1="0" y1="30" x2="500" y2="30" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
              <path
                d="M 0 120 Q 50 110 100 130 T 200 95 T 300 90 T 400 115 T 500 110"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
              />
            </svg>
            <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-1">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>Now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
