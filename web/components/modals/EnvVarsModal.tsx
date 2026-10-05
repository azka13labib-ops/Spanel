import React, { useState, useEffect, useCallback } from "react";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  FileText,
  List,
  AlertTriangle,
  Play,
} from "lucide-react";
import { Project, EnvVarItem } from "@/types";
import {
  fetchProjectEnvVars,
  setProjectEnvVar,
  bulkSetProjectEnvVars,
  deleteProjectEnvVar,
  postDeploy,
} from "@/lib/api";

interface EnvVarsModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onTriggerDeploy?: (project: Project) => void;
}

export const EnvVarsModal: React.FC<EnvVarsModalProps> = ({
  isOpen,
  project,
  onClose,
  onTriggerDeploy,
}) => {
  const [envVars, setEnvVars] = useState<EnvVarItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeMode, setActiveMode] = useState<"list" | "bulk">("list");

  // Single variable form
  const [newKey, setNewKey] = useState<string>("");
  const [newVal, setNewVal] = useState<string>("");
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Bulk form
  const [rawEnv, setRawEnv] = useState<string>("");
  const [isSavingBulk, setIsSavingBulk] = useState<boolean>(false);

  // UI state
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadEnvVars = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const data = await fetchProjectEnvVars(project.id);
      setEnvVars(data);
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (!isOpen || !project) return;
    
    let mounted = true;
    // Initial fetch inside effect
    fetchProjectEnvVars(project.id).then((data) => {
      if (mounted) {
        setEnvVars(data);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    setIsAdding(true);

    const cleanKey = newKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    const res = await setProjectEnvVar(project.id, cleanKey, newVal.trim());
    if (res.ok && res.data) {
      setNewKey("");
      setNewVal("");
      await loadEnvVars();
    } else {
      alert(res.error || "Gagal menyimpan environment variable");
    }
    setIsAdding(false);
  };

  const handleSaveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawEnv.trim()) return;
    setIsSavingBulk(true);

    const res = await bulkSetProjectEnvVars(project.id, rawEnv);
    if (res.ok) {
      setRawEnv("");
      setActiveMode("list");
      await loadEnvVars();
      alert(`✓ ${res.count || 0} environment variables berhasil disimpan!`);
    } else {
      alert(res.error || "Gagal menyimpan bulk variables");
    }
    setIsSavingBulk(false);
  };

  const handleDelete = async (envId: string, keyName: string) => {
    if (!confirm(`Hapus variable ${keyName}?`)) return;
    const res = await deleteProjectEnvVar(project.id, envId);
    if (res.ok) {
      await loadEnvVars();
    } else {
      alert(res.error || "Gagal menghapus variable");
    }
  };

  const toggleShowValue = (id: string) => {
    setShowValues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRedeploy = async () => {
    if (onTriggerDeploy) {
      onClose();
      onTriggerDeploy(project);
    } else {
      await postDeploy(project.id);
      alert("Deployment dipicu untuk menerapkan environment variables baru!");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl overflow-hidden border border-gray-200 shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-gray-900">Environment Variables</h3>
                <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                  {project.name}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Variables are securely injected at container runtime.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition cursor-pointer">
            ✕
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-6 pt-4 flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition cursor-pointer ${
                activeMode === "list"
                  ? "bg-gray-100 text-gray-900 border border-gray-200"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <List className="h-4 w-4" />
              Variables List ({envVars.length})
            </button>
            <button
              onClick={() => setActiveMode("bulk")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition cursor-pointer ${
                activeMode === "bulk"
                  ? "bg-gray-100 text-gray-900 border border-gray-200"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <FileText className="h-4 w-4" />
              Bulk Paste (.env)
            </button>
          </div>

          <button
            onClick={loadEnvVars}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-md transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeMode === "list" ? (
            <>
              {/* Form Add Single Variable */}
              <form onSubmit={handleAddSingle} className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                <span className="text-sm font-semibold text-gray-700">Add New Variable</span>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="KEY (e.g. JWT_SECRET)"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-mono text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none uppercase shadow-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="VALUE (e.g. my-super-secret-token)"
                      value={newVal}
                      onChange={(e) => setNewVal(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-mono text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="md:col-span-1 px-4 py-2 rounded-md bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isAdding ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    <span>Add</span>
                  </button>
                </div>
              </form>

              {/* Variables List Table */}
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-500 space-y-2">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
                  <p>Loading environment variables...</p>
                </div>
              ) : envVars.length === 0 ? (
                <div className="p-8 text-center border border-gray-200 rounded-xl bg-gray-50 space-y-2">
                  <Key className="h-6 w-6 text-gray-400 mx-auto" />
                  <p className="text-sm font-semibold text-gray-700">No Environment Variables Yet</p>
                  <p className="text-sm text-gray-500">
                    Add variables above or paste a .env file via the Bulk Paste tab.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100 shadow-sm">
                  {envVars.map((env) => {
                    const isVisible = showValues[env.id];
                    return (
                      <div
                        key={env.id}
                        className="flex items-center justify-between p-3.5 px-4 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-sm font-medium text-indigo-700">{env.key}</span>
                            {env.is_system_injected && (
                              <span className="text-[11px] font-mono bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                                System / DB
                              </span>
                            )}
                          </div>
                          <span className="text-gray-400 select-none">=</span>
                          <span className="font-mono text-sm text-gray-600 truncate max-w-sm">
                            {isVisible ? env.value : "••••••••••••••••••••"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                          <button
                            onClick={() => toggleShowValue(env.id)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                            title={isVisible ? "Hide value" : "Reveal value"}
                          >
                            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(env.value, env.id)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                            title="Copy value"
                          >
                            {copiedKey === env.id ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(env.id, env.key)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition cursor-pointer"
                            title="Delete variable"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Bulk Paste View */
            <form onSubmit={handleSaveBulk} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Paste your .env contents
                </label>
                <textarea
                  rows={10}
                  required
                  placeholder={`# Paste format KEY=VALUE per line:\nNEXT_PUBLIC_API_URL=https://api.myapp.com\nJWT_SECRET=supersecret123\nSTRIPE_KEY=pk_test_123456\nPORT=3000`}
                  value={rawEnv}
                  onChange={(e) => setRawEnv(e.target.value)}
                  className="w-full p-4 rounded-xl bg-white border border-gray-300 font-mono text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none leading-relaxed shadow-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Lines starting with # will be skipped.</span>
                <button
                  type="submit"
                  disabled={isSavingBulk || !rawEnv.trim()}
                  className="px-6 py-2.5 rounded-md bg-gray-900 text-white font-medium text-sm shadow-sm hover:bg-gray-800 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSavingBulk ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Parsing &amp; Encrypting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save All Variables</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Alert Notice */}
          <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-yellow-600" />
              <div>
                <span className="font-semibold text-yellow-900">Redeploy Note:</span>
                <p className="text-yellow-700 mt-0.5">
                  Environment variable changes will take effect on the next container build/run.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRedeploy}
              className="shrink-0 px-3 py-1.5 rounded-md bg-yellow-400 text-yellow-900 font-semibold text-xs hover:bg-yellow-500 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Play className="h-3.5 w-3.5 fill-yellow-900" />
              <span>Redeploy Now</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-md bg-white border border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-700 transition cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
