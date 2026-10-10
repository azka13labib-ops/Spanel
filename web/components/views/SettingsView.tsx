import React, { useState } from "react";
import {
  Bot,
  Globe,
  Database,
  Server,
  Sparkles,
} from "lucide-react";
import { AIAssistantView } from "@/components/ai/AIAssistantView";
import { DNSManagerView } from "@/components/dns/DNSManagerView";
import { MarketplaceView } from "@/components/marketplace/MarketplaceView";
import { ServerHygieneView } from "@/components/server/ServerHygieneView";
import { Project, SystemMetrics } from "@/types";

interface SettingsViewProps {
  metrics: SystemMetrics;
  projects: Project[];
  onOpenUpdateModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ metrics, projects, onOpenUpdateModal }) => {
  const [activeSubTab, setActiveSubTab] = useState<"ai" | "dns" | "databases" | "server">("ai");

  const subTabs = [
    { id: "ai" as const, label: "AI Diagnostics (BYOK)", icon: Bot },
    { id: "dns" as const, label: "Cloudflare DNS", icon: Globe },
    { id: "databases" as const, label: "Databases & Backups", icon: Database },
    { id: "server" as const, label: "Server & Nginx", icon: Server },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">System Settings</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Configure API credentials, domain zone routing, database instances, and server hygiene.
          </p>
        </div>

        {onOpenUpdateModal && (
          <button
            onClick={onOpenUpdateModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition shadow-2xs cursor-pointer self-start sm:self-auto"
            title="Periksa dan instal pembaruan sPanel"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Cek Pembaruan sPanel</span>
          </button>
        )}
      </div>

      {/* Subtab Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-1.5 rounded-xl border border-gray-200 shadow-2xs text-xs">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Subtab Contents */}
      <div className="pt-2">
        {activeSubTab === "ai" && <AIAssistantView />}
        {activeSubTab === "dns" && <DNSManagerView hostIp={metrics.host_ip} />}
        {activeSubTab === "databases" && <MarketplaceView projects={projects} />}
        {activeSubTab === "server" && <ServerHygieneView />}
      </div>
    </div>
  );
};
