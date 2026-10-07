import React, { useState } from "react";
import { Project } from "@/types";
import { X, Settings, Trash2, Save, Globe, GitBranch, Activity, ShieldAlert, Check } from "lucide-react";
import { deleteProject, updateProject, updateProjectDomain } from "@/lib/api";

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSuccess: () => void;
}

export function ProjectSettingsModal({ isOpen, onClose, project, onSuccess }: ProjectSettingsModalProps) {
  const [branch, setBranch] = useState("");
  const [port, setPort] = useState(3000);
  const [healthcheck, setHealthcheck] = useState("/");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [prevProject, setPrevProject] = useState(project);

  if (project !== prevProject) {
    setPrevProject(project);
    if (project) {
      setBranch(project.branch || "main");
      setPort(project.target_port || 3000);
      setHealthcheck(project.healthcheck_path || "/");
      setDomain(project.custom_domain || "");
      setDeleteConfirm("");
      setSavedSuccess(false);
    }
  }

  if (!isOpen || !project) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);
    const res = await updateProject(project.id, {
      branch,
      target_port: port,
      healthcheck_path: healthcheck,
    });
    
    // Also update domain if changed
    const domainRes = await updateProjectDomain(project.id, domain.trim());

    setLoading(false);
    if (res.ok && domainRes.ok) {
      setSavedSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } else {
      alert("Failed to update project: " + (res.error || domainRes.error));
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== project.name) {
      alert("Please type the project name to confirm.");
      return;
    }
    setLoading(true);
    const res = await deleteProject(project.id);
    setLoading(false);
    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      alert("Failed to delete project: " + res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs" onClick={onClose} />
      
      <div className="relative w-full max-w-xl bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-900 text-white shadow-xs">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Project Settings</h2>
              <p className="text-xs text-gray-500 font-mono">{project.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Git Configuration Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <GitBranch className="h-3.5 w-3.5 text-indigo-500" />
                <span>Git Source Control</span>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Deploy Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-2xs"
                />
                <p className="text-[11px] text-gray-400">Pushes or webhooks on this branch will trigger automated deployments.</p>
              </div>
            </div>

            {/* Domain & Routing Section */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <Globe className="h-3.5 w-3.5 text-indigo-500" />
                <span>Custom Domain & Traefik Routing</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Custom Domain Name</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. app.mycompany.com"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-2xs"
                />
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200 text-[11px] text-gray-500 space-y-1 mt-1.5">
                  <p className="font-medium text-gray-700">💡 DNS Configuration Instructions:</p>
                  <p>Point an <strong>A Record</strong> or <strong>CNAME</strong> in your DNS provider (Cloudflare, Namecheap, Route53) to this sPanel server.</p>
                </div>
              </div>
            </div>

            {/* Container & Port Settings */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <Activity className="h-3.5 w-3.5 text-indigo-500" />
                <span>Container Network & Health</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Target Container Port</label>
                  <input
                    type="number"
                    value={port || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setPort(isNaN(val) ? 0 : val);
                    }}
                    placeholder="3000"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-2xs"
                  />
                  <p className="text-[10px] text-gray-400">Internal port your app listens on (e.g. 3000, 8080, 80).</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Healthcheck Path</label>
                  <input
                    type="text"
                    value={healthcheck}
                    onChange={(e) => setHealthcheck(e.target.value)}
                    placeholder="/"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-2xs"
                  />
                  <p className="text-[10px] text-gray-400">HTTP path for container uptime checks (e.g. / or /api/health).</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer ${
                savedSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              } disabled:opacity-50`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Settings Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{loading ? "Saving changes..." : "Save Project Settings"}</span>
                </>
              )}
            </button>
          </form>

          {/* Danger Zone */}
          <div className="pt-5 border-t border-rose-100 bg-rose-50/50 p-4 rounded-xl border border-rose-200/80 space-y-3">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="h-4 w-4" />
              <span>Danger Zone</span>
            </div>
            <p className="text-xs text-gray-600">
              Permanently delete this project, its Docker container, volume mounts, and deployment histories.
            </p>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">
                Type <strong>{project.name}</strong> to confirm deletion:
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={project.name}
                className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono shadow-2xs"
              />
            </div>
            
            <button
              onClick={handleDelete}
              disabled={loading || deleteConfirm !== project.name}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition disabled:opacity-40 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Project Permanently</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
