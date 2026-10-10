import React, { useState } from "react";
import {
  Search,
  Bell,
  Plus,
  Menu,
  Globe,
  Check,
  Copy,
  User,
  ShieldCheck,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { SystemMetrics } from "@/types";

interface TopbarProps {
  metrics: SystemMetrics;
  onOpenNewProject: () => void;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  metrics,
  onOpenNewProject,
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  onLogout,
}) => {
  const [copiedIP, setCopiedIP] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleCopyIP = () => {
    if (metrics.host_ip) {
      navigator.clipboard.writeText(metrics.host_ip);
      setCopiedIP(true);
      setTimeout(() => setCopiedIP(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu Toggle & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 lg:hidden cursor-pointer"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search applications, repositories, or containers..."
            className="w-full pl-9 pr-8 py-2 bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions, IP, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Host IP Indicator */}
        {metrics.host_ip && (
          <button
            onClick={handleCopyIP}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 transition text-xs font-mono cursor-pointer"
            title="Click to copy Server Public/Host IP"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>{metrics.host_ip}</span>
            {copiedIP ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400" />
            )}
          </button>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
            title="System notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-50 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-semibold text-gray-900">System Activity</span>
                <span className="text-[10px] text-gray-400">All services healthy</span>
              </div>
              <div className="space-y-1.5 text-gray-600">
                <div className="p-2 rounded-lg bg-gray-50 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Nginx Reverse Proxy Active</p>
                    <p className="text-[11px] text-gray-500">Automated vhost generation enabled.</p>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 flex items-start gap-2">
                  <Globe className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Live DNS Verification Ready</p>
                    <p className="text-[11px] text-gray-500">Instant lookup for custom domains.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Administrator Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 sm:px-2 sm:py-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold text-gray-900 leading-tight">admin</span>
              <span className="text-[10px] text-gray-400 leading-tight">Administrator</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl p-1 z-50 text-xs animate-in fade-in">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="font-medium text-gray-900">Signed in as admin</p>
                <p className="text-[10px] text-gray-400 font-mono">100.125.7.123</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  if (onLogout) onLogout();
                  else {
                    localStorage.removeItem("spanel_token");
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer font-medium mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenNewProject}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer active:scale-98"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Deploy Application</span>
          <span className="sm:hidden">Deploy</span>
        </button>
      </div>
    </header>
  );
};
