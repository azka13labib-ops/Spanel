import React from "react";
import { Layers, Database, Bot, Server } from "lucide-react";
import { DashboardTab } from "@/types";

interface NavTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  projectCount: number;
}

export const NavTabs: React.FC<NavTabsProps> = ({ activeTab, onTabChange, projectCount }) => {
  const tabs = [
    { id: "projects" as const, label: `Projects (${projectCount})`, icon: Layers },
    { id: "marketplace" as const, label: "Marketplace", icon: Database },
    { id: "ai" as const, label: "AI DevOps Agent", icon: Bot },
    { id: "server" as const, label: "Janitor & Host", icon: Server },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer whitespace-nowrap ${
              isActive
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
