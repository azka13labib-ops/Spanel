import React, { useState } from "react";
import { Project } from "@/types";
import { X, Settings, Trash2, Save } from "lucide-react";
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
    }
  }

  if (!isOpen || !project) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updateProject(project.id, {
      branch,
      target_port: port,
      healthcheck_path: healthcheck,
    });
    
    // Also update domain if changed (or even if not, just call it)
    const domainRes = await updateProjectDomain(project.id, domain);

    setLoading(false);
    if (res.ok && domainRes.ok) {
      onSuccess();
      onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 text-gray-700">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Project Settings: {project.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          {/* General Settings */}
          <form onSubmit={handleSave} className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Target Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Custom Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. app.example.com"
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Do not include http:// or https://. Ensure you have pointed an A/CNAME record to this server.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Target Port</label>
                <input
                  type="number"
                  value={port || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setPort(isNaN(val) ? 0 : val);
                  }}
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Healthcheck Path</label>
                <input
                  type="text"
                  value={healthcheck}
                  onChange={(e) => setHealthcheck(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </form>

          {/* Danger Zone */}
          <div className="pt-6 border-t border-gray-200 space-y-4">
            <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
            <p className="text-sm text-gray-500">
              Deleting a project will remove its container, volumes, and all data permanently.
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Type <strong>{project.name}</strong> to confirm deletion
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={project.name}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm"
              />
            </div>
            
            <button
              onClick={handleDelete}
              disabled={loading || deleteConfirm !== project.name}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
