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
    <div className="flex items-center gap-4 border-b border-gray-200 pb-px overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              isActive
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
