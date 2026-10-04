import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  Link,
  Trash2,
  ExternalLink,
  Layers,
  Key,
  HardDrive,
} from "lucide-react";
import { MarketplaceTemplate, InstalledService, Project, DBCredentials } from "@/types";
import {
  fetchMarketplaceServices,
  installMarketplaceService,
  attachDatabaseToProject,
  deleteMarketplaceService,
} from "@/lib/api";
import { DatabaseBackupModal } from "@/components/modals/DatabaseBackupModal";

const availableTemplates: MarketplaceTemplate[] = [
  {
    id: "postgresql",
    name: "PostgreSQL 16",
    desc: "Production-ready relational database with JSONB and advanced indexing.",
    port: 5432,
    color: "text-blue-400",
    category: "SQL",
  },
  {
    id: "mysql",
    name: "MySQL 8.0",
    desc: "The world's most popular open-source relational database engine.",
    port: 3306,
    color: "text-orange-400",
    category: "SQL",
  },
  {
    id: "redis",
    name: "Redis 7.2",
    desc: "Blazing fast in-memory key-value data store, cache, and message broker.",
    port: 6379,
    color: "text-red-400",
    category: "Cache",
  },
  {
    id: "sqlite",
    name: "SQLite 3",
    desc: "Zero-config serverless embedded database with persistent volume & Web Inspector.",
    port: 8085,
    color: "text-emerald-400",
    category: "Embedded",
  },
];

interface MarketplaceViewProps {
  projects: Project[];
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({ projects }) => {
  const [installedServices, setInstalledServices] = useState<InstalledService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [provisioning, setProvisioning] = useState<string | null>(null);

  // Attach modal state
  const [attachService, setAttachService] = useState<InstalledService | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isAttaching, setIsAttaching] = useState<boolean>(false);

  // Credentials modal state
  const [viewCreds, setViewCreds] = useState<DBCredentials | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Backup modal state
  const [backupService, setBackupService] = useState<InstalledService | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    const data = await fetchMarketplaceServices();
    setInstalledServices(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadServices();
    };
    init();
  }, [loadServices]);

  const handleLaunch = async (template: MarketplaceTemplate) => {
    setProvisioning(template.id);
    const res = await installMarketplaceService(template.id);
    if (res.ok && res.data) {
      await loadServices();
      if (res.data.credentials) {
        setViewCreds(res.data.credentials);
      }
    } else {
      alert(`Gagal meluncurkan database: ${res.error || "Unknown error"}`);
    }
    setProvisioning(null);
  };

  const handleAttachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachService || !selectedProjectId) return;
    setIsAttaching(true);

    const res = await attachDatabaseToProject(selectedProjectId, attachService.id);
    if (res.ok && res.data) {
      alert(`✓ Berhasil menghubungkan ${attachService.service_name.toUpperCase()}!\nVariable DATABASE_URL otomatis disuntikkan ke project.`);
      setAttachService(null);
    } else {
      alert(`Gagal menghubungkan: ${res.error || "Unknown error"}`);
    }
    setIsAttaching(false);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Hapus database container ini? Data di dalam container akan dinonaktifkan.")) return;
    const res = await deleteMarketplaceService(serviceId);
    if (res.ok) {
      await loadServices();
    } else {
      alert(`Gagal menghapus: ${res.error || "Unknown error"}`);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">1-Click Database & Service Templates</h2>
          <p className="text-sm text-slate-400">
            Jalankan database container otomatis dengan storage persisten & auto-wire <code>DATABASE_URL</code> ke proyek kamu.
          </p>
        </div>
        <button
          onClick={loadServices}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {availableTemplates.map((tmpl) => {
          const installed = installedServices.find(
            (s) => s.service_name.toLowerCase() === tmpl.id.toLowerCase()
          );
          const isBusy = provisioning === tmpl.id;

          return (
            <div
              key={tmpl.id}
              className="glass-panel glass-card-hover rounded-2xl p-6 flex flex-col justify-between space-y-5 relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                    <Database className={`h-7 w-7 ${tmpl.color}`} />
                  </div>
                  {installed ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Running
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      Port {tmpl.port}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-white">{tmpl.name}</h3>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                      {tmpl.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{tmpl.desc}</p>
                </div>

                {installed && installed.credentials && (
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Internal Host:</span>
                      <span className="text-white truncate">{installed.internal_hostname}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Port:</span>
                      <span className="text-cyan-400 font-bold">:{installed.internal_port}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {installed ? (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setAttachService(installed);
                          setSelectedProjectId(projects[0]?.id || "");
                        }}
                        className="flex-1 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Link className="h-3.5 w-3.5" />
                        Attach to App
                      </button>

                      <button
                        onClick={() => {
                          if (installed.credentials) {
                            setViewCreds(installed.credentials);
                          }
                        }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
                        title="View Credentials & URI"
                      >
                        <Key className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => setBackupService(installed)}
                        className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition cursor-pointer"
                        title="Backup & Snapshot Database"
                      >
                        <HardDrive className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(installed.id)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition cursor-pointer"
                        title="Stop & Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {tmpl.id === "sqlite" && (
                      <a
                        href="http://localhost:8085"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <span>Open SQLite Web UI</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => handleLaunch(tmpl)}
                    disabled={isBusy}
                    className="w-full py-2.5 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isBusy ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Provisioning Docker...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ 1-Click Launch</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Attach Database to Project */}
      {attachService && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl w-full max-w-md p-6 space-y-5 border-cyan-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Link className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Attach Database to Project</h3>
                  <p className="text-xs text-slate-400">
                    Service: <span className="text-cyan-400 font-mono font-bold uppercase">{attachService.service_name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAttachService(null)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center space-y-2">
                <Layers className="h-6 w-6 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">Belum ada project yang dibuat.</p>
              </div>
            ) : (
              <form onSubmit={handleAttachSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Pilih Target Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-sm text-white focus:border-cyan-400 outline-none cursor-pointer font-mono"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#0e121a]">
                        {p.name} ({p.repo_fullname})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-slate-300 space-y-1">
                  <span className="font-semibold text-cyan-400">🪄 Auto-injected Variable:</span>
                  <p className="font-mono text-[11px] text-slate-300 truncate">
                    {attachService.service_name === "redis" ? "REDIS_URL" : "DATABASE_URL"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Project akan langsung mengenali database ini di environment container saat redeploy.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAttachService(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAttaching}
                    className="px-5 py-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 text-black font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isAttaching ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Attaching...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Confirm &amp; Attach</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal View Credentials */}
      {viewCreds && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl w-full max-w-lg p-6 space-y-5 border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Database Credentials</h3>
                  <p className="text-xs text-slate-400 uppercase font-mono">{viewCreds.service_name}</p>
                </div>
              </div>
              <button onClick={() => setViewCreds(null)} className="text-slate-400 hover:text-white text-sm cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <span className="text-slate-500">Internal Connection URI (Container Network):</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-cyan-400 break-all">{viewCreds.internal_uri}</span>
                  <button
                    onClick={() => copyToClipboard(viewCreds.internal_uri, "internal")}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedKey === "internal" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <span className="text-slate-500">External / Host Connection URI (DBeaver / TablePlus / Browser):</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-purple-400 break-all">{viewCreds.external_uri}</span>
                  <button
                    onClick={() => copyToClipboard(viewCreds.external_uri, "external")}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedKey === "external" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-slate-500">User:</span> <span className="text-white">{viewCreds.username}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-slate-500">Port:</span> <span className="text-white">{viewCreds.port}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-slate-500">DB Name:</span> <span className="text-white">{viewCreds.database_name}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500">Pass:</span>{" "}
                    <span className="text-amber-400 truncate">{viewCreds.password}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(viewCreds.password, "pass")}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedKey === "pass" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewCreds(null)}
                className="px-5 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Database Backup & Snapshot */}
      <DatabaseBackupModal
        isOpen={!!backupService}
        onClose={() => setBackupService(null)}
        service={backupService}
      />
    </div>
  );
};
