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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl w-full max-w-3xl overflow-hidden border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Environment Variables</h3>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                  {project.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Nilai dienkripsi menggunakan AES-256-GCM dan disuntikkan saat container dijalankan.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg text-sm cursor-pointer">
            ✕
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-6 pt-4 flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeMode === "list"
                  ? "bg-white/10 text-cyan-400 border border-white/15"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Variables List ({envVars.length})
            </button>
            <button
              onClick={() => setActiveMode("bulk")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeMode === "bulk"
                  ? "bg-white/10 text-cyan-400 border border-white/15"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Bulk Paste (.env)
            </button>
          </div>

          <button
            onClick={loadEnvVars}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeMode === "list" ? (
            <>
              {/* Form Add Single Variable */}
              <form onSubmit={handleAddSingle} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                <span className="text-xs font-bold text-slate-300">Add New Variable</span>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="KEY (e.g. JWT_SECRET)"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:border-cyan-400 outline-none uppercase"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="VALUE (e.g. my-super-secret-token)"
                      value={newVal}
                      onChange={(e) => setNewVal(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-white placeholder-slate-600 focus:border-cyan-400 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="md:col-span-1 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isAdding ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    <span>Add</span>
                  </button>
                </div>
              </form>

              {/* Variables List Table */}
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-cyan-400" />
                  <p>Loading environment variables...</p>
                </div>
              ) : envVars.length === 0 ? (
                <div className="p-8 text-center border border-white/10 rounded-xl bg-black/30 space-y-2">
                  <Key className="h-6 w-6 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">No Environment Variables Yet</p>
                  <p className="text-xs text-slate-500">
                    Tambahkan variable di atas atau paste file .env kamu lewat tab Bulk Paste.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-[#07090e] overflow-hidden divide-y divide-white/5">
                  {envVars.map((env) => {
                    const isVisible = showValues[env.id];
                    return (
                      <div
                        key={env.id}
                        className="flex items-center justify-between p-3.5 px-4 hover:bg-white/2 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs font-bold text-cyan-400">{env.key}</span>
                            {env.is_system_injected && (
                              <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">
                                System / DB
                              </span>
                            )}
                          </div>
                          <span className="text-slate-600 select-none">=</span>
                          <span className="font-mono text-xs text-slate-300 truncate max-w-sm">
                            {isVisible ? env.value : "••••••••••••••••••••"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                          <button
                            onClick={() => toggleShowValue(env.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                            title={isVisible ? "Hide value" : "Reveal value"}
                          >
                            {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(env.value, env.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Copy value"
                          >
                            {copiedKey === env.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(env.id, env.key)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition cursor-pointer"
                            title="Delete variable"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Paste your .env contents
                </label>
                <textarea
                  rows={10}
                  required
                  placeholder={`# Paste format KEY=VALUE per line:\nNEXT_PUBLIC_API_URL=https://api.myapp.com\nJWT_SECRET=supersecret123\nSTRIPE_KEY=pk_test_123456\nPORT=3000`}
                  value={rawEnv}
                  onChange={(e) => setRawEnv(e.target.value)}
                  className="w-full p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-white placeholder-slate-600 focus:border-cyan-400 outline-none leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Lines starting with # will be skipped.</span>
                <button
                  type="submit"
                  disabled={isSavingBulk || !rawEnv.trim()}
                  className="px-6 py-2.5 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 text-black font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSavingBulk ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Parsing &amp; Encrypting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Save All Variables</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Alert Notice */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Catatan Redeploy:</span>
                <p className="text-amber-200/80 mt-0.5">
                  Perubahan environment variables akan aktif pada build/run container berikutnya.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRedeploy}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-400 text-black font-bold text-[11px] hover:bg-amber-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Play className="h-3 w-3 fill-black" />
              <span>Redeploy Now</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
