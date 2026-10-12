"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  RefreshCw,
  Plus,
  Check,
  Copy,
  Link as LinkIcon,
  Trash2,
  Key,
  HardDrive,
  RotateCw,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Server,
  Eye,
  EyeOff,
  Radio,
  FolderGit2,
  ShieldCheck,
  FileCode2,
  X,
} from "lucide-react";
import {
  MarketplaceTemplate,
  InstalledService,
  Project,
  DBCredentials,
  ProvisionDatabasePayload,
} from "@/types";
import {
  fetchMarketplaceServices,
  installMarketplaceService,
  restartMarketplaceService,
  fetchMarketplaceCredentials,
  attachDatabaseToProject,
  deleteMarketplaceService,
} from "@/lib/api";
import { DatabaseBackupModal } from "@/components/modals/DatabaseBackupModal";

const availableTemplates: MarketplaceTemplate[] = [
  {
    id: "postgresql",
    name: "PostgreSQL",
    engine: "PostgreSQL",
    version: "16-alpine",
    desc: "Enterprise-grade relational SQL database with JSONB support, ACID transactions, and full-text search.",
    port: 5432,
    category: "SQL",
    persistence: "Docker Named Volume (spanel-vol-postgres)",
    is_network_daemon: true,
  },
  {
    id: "mysql",
    name: "MySQL",
    engine: "MySQL",
    version: "8.0",
    desc: "The world's standard relational database engine, tailored for Laravel, WordPress, and PHP ecosystems.",
    port: 3306,
    category: "SQL",
    persistence: "Docker Named Volume (spanel-vol-mysql)",
    is_network_daemon: true,
  },
  {
    id: "redis",
    name: "Redis",
    engine: "Redis",
    version: "7.2-alpine",
    desc: "Blazing-fast in-memory data store for application caching, session management, and message queues.",
    port: 6379,
    category: "Cache",
    persistence: "Docker Named Volume (spanel-vol-redis with AOF/RDB)",
    is_network_daemon: true,
  },
  {
    id: "sqlite",
    name: "SQLite",
    engine: "SQLite 3",
    version: "3.x (Embedded)",
    desc: "Serverless, zero-config embedded file database with WAL mode. Mounts directly to attached app containers.",
    port: 0,
    category: "Embedded",
    persistence: "Host Storage Directory (./data/sqlite/sqlite.db)",
    is_network_daemon: false,
  },
];

const generateRandomPassword = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let pass = "";
  for (let i = 0; i < 24; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

interface MarketplaceViewProps {
  projects: Project[];
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({ projects }) => {
  const [installedServices, setInstalledServices] = useState<InstalledService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Provision modal state
  const [provisionTemplate, setProvisionTemplate] = useState<MarketplaceTemplate | null>(null);
  const [provisionForm, setProvisionForm] = useState<ProvisionDatabasePayload>({
    service_name: "postgresql",
    custom_name: "",
    database_name: "spanel_db",
    username: "spanel",
    password: "",
    expose_host_port: false,
    host_port: 5432,
    attach_project_id: "",
  });
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [showProvisionPassword, setShowProvisionPassword] = useState<boolean>(false);

  // Credentials modal state
  const [viewCreds, setViewCreds] = useState<DBCredentials | null>(null);
  const [credsService, setCredsService] = useState<InstalledService | null>(null);
  const [showCredsPassword, setShowCredsPassword] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Attach modal state
  const [attachService, setAttachService] = useState<InstalledService | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isAttaching, setIsAttaching] = useState<boolean>(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<InstalledService | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Backup modal state
  const [backupService, setBackupService] = useState<InstalledService | null>(null);

  // Success / error banner
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMarketplaceServices();
      setInstalledServices(data);
    } catch {
      showToast("error", "Failed to load database services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchMarketplaceServices()
      .then((data) => {
        if (!ignore) setInstalledServices(data);
      })
      .catch(() => {
        if (!ignore) showToast("error", "Failed to load database services");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleOpenProvisionModal = (tmpl: MarketplaceTemplate) => {
    setProvisionTemplate(tmpl);
    const defaultPort = tmpl.port;
    const defaultUser = tmpl.id === "redis" ? "default" : tmpl.id === "sqlite" ? "sqlite" : "spanel";
    const defaultDb = tmpl.id === "redis" ? "0" : tmpl.id === "sqlite" ? "sqlite.db" : "spanel_db";
    const generatedPass = tmpl.id === "sqlite" ? "" : generateRandomPassword();

    setProvisionForm({
      service_name: tmpl.id,
      custom_name: `spanel-${tmpl.id}`,
      database_name: defaultDb,
      username: defaultUser,
      password: generatedPass,
      expose_host_port: false,
      host_port: defaultPort,
      attach_project_id: projects[0]?.id || "",
    });
    setShowProvisionPassword(false);
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionTemplate) return;

    setIsProvisioning(true);
    try {
      const res = await installMarketplaceService(provisionForm);
      if (res.ok && res.data) {
        showToast("success", `Database ${res.data.service.display_name || res.data.service.service_name} successfully provisioned!`);
        setProvisionTemplate(null);
        await loadServices();
        if (res.data.credentials) {
          setViewCreds(res.data.credentials);
          setCredsService(res.data.service);
        }
      } else {
        showToast("error", res.error || "Failed to provision database");
      }
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleOpenCredentials = async (svc: InstalledService) => {
    if (svc.credentials) {
      setViewCreds(svc.credentials);
      setCredsService(svc);
      setShowCredsPassword(false);
      return;
    }
    const res = await fetchMarketplaceCredentials(svc.id);
    if (res.ok && res.data) {
      setViewCreds(res.data);
      setCredsService(svc);
      setShowCredsPassword(false);
    } else {
      showToast("error", res.error || "Failed to fetch credentials");
    }
  };

  const handleRestart = async (svc: InstalledService) => {
    setActionLoading((prev) => ({ ...prev, [svc.id]: true }));
    try {
      const res = await restartMarketplaceService(svc.id);
      if (res.ok) {
        showToast("success", `Container ${svc.container_id} restarted (${res.status})`);
        await loadServices();
      } else {
        showToast("error", res.error || "Failed to restart container");
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [svc.id]: false }));
    }
  };

  const handleAttachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachService || !selectedProjectId) return;
    setIsAttaching(true);

    try {
      const res = await attachDatabaseToProject(selectedProjectId, attachService.id);
      if (res.ok) {
        const targetProj = projects.find((p) => p.id === selectedProjectId);
        showToast(
          "success",
          `Connected ${attachService.service_name.toUpperCase()} to ${targetProj?.name || "project"}! Framework env variables injected.`
        );
        setAttachService(null);
        await loadServices();
      } else {
        showToast("error", res.error || "Failed to link database");
      }
    } finally {
      setIsAttaching(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await deleteMarketplaceService(deleteTarget.id);
      if (res.ok) {
        showToast("success", `Database container ${deleteTarget.container_id} removed`);
        setDeleteTarget(null);
        await loadServices();
      } else {
        showToast("error", res.error || "Failed to remove database");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatLaravelEnvSnippet = (creds: DBCredentials, svc: InstalledService | null) => {
    const sName = (svc?.service_name || creds.service_name).toLowerCase();
    if (sName === "postgresql" || sName === "postgres") {
      return `# Laravel / Framework Database Configuration
DB_CONNECTION=pgsql
DB_HOST=${creds.host}
DB_PORT=${creds.port}
DB_DATABASE=${creds.database_name}
DB_USERNAME=${creds.username}
DB_PASSWORD=${creds.password}

# Direct Connection String
DATABASE_URL=${creds.internal_uri}`;
    }
    if (sName === "mysql") {
      return `# Laravel / Framework Database Configuration
DB_CONNECTION=mysql
DB_HOST=${creds.host}
DB_PORT=${creds.port}
DB_DATABASE=${creds.database_name}
DB_USERNAME=${creds.username}
DB_PASSWORD=${creds.password}

# Direct Connection String
DATABASE_URL=${creds.internal_uri}`;
    }
    if (sName === "redis") {
      return `# Laravel / Framework Redis Configuration
REDIS_HOST=${creds.host}
REDIS_PORT=${creds.port}
REDIS_PASSWORD=${creds.password}
REDIS_DB=0

# Direct Connection String
REDIS_URL=${creds.internal_uri}`;
    }
    return `# SQLite Configuration
DB_CONNECTION=sqlite
DB_DATABASE=/data/sqlite.db
SQLITE_PATH=/data/sqlite.db`;
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start gap-3 border transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* SECTION 1: PROVISIONED DATABASES */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span>Provisioned Database Instances</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-mono font-medium">
                {installedServices.length}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Active containerized engines and persistent data volumes running on your server.
            </p>
          </div>

          <button
            onClick={loadServices}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-2xs transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
            title="Refresh database state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : "text-gray-500"}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center border border-gray-200 rounded-xl bg-white space-y-3 shadow-2xs">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
            <p className="text-sm font-medium text-gray-700">Inspecting Docker database runtime...</p>
          </div>
        ) : installedServices.length === 0 ? (
          <div className="p-10 text-center border border-gray-200 rounded-xl bg-white space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 mx-auto shadow-2xs">
              <Database className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900">No provisioned databases yet</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Choose an available template below to provision an isolated, persistent container with automatic credential generation and container networking.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {installedServices.map((svc) => {
              const isBusy = actionLoading[svc.id];
              const isRunning = svc.status === "running";
              const isStopped = svc.status === "stopped" || svc.status === "exited";

              return (
                <div
                  key={svc.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Engine, Name & Real Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-gray-900 leading-tight">
                              {svc.display_name || svc.service_name.toUpperCase()}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {svc.engine_version || svc.service_name}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono border shrink-0 ${
                          isRunning
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isStopped
                            ? "bg-gray-100 text-gray-600 border-gray-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isRunning ? "bg-emerald-500 animate-pulse" : isStopped ? "bg-gray-400" : "bg-red-500"
                          }`}
                        />
                        <span className="capitalize">{svc.status || "Unknown"}</span>
                      </span>
                    </div>

                    {/* Meta Spec Table */}
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-mono space-y-1.5">
                      <div className="flex items-center justify-between text-gray-600">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Server className="w-3.5 h-3.5" />
                          <span>Internal Host:</span>
                        </span>
                        <span className="font-semibold text-gray-900 truncate max-w-40" title={svc.internal_hostname}>
                          {svc.internal_hostname}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-gray-600">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Radio className="w-3.5 h-3.5" />
                          <span>Port:</span>
                        </span>
                        <span className="font-semibold text-gray-900">
                          {svc.internal_port > 0 ? `:${svc.internal_port}` : "Embedded File"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-gray-600">
                        <span className="text-gray-400 flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5" />
                          <span>Storage:</span>
                        </span>
                        <span className="text-gray-700 truncate max-w-40" title={svc.volume_host_path}>
                          {svc.volume_host_path || "Default Volume"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-gray-600">
                        <span className="text-gray-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Network:</span>
                        </span>
                        <span className="text-gray-700">
                          {svc.expose_host_port ? `Host 127.0.0.1:${svc.host_port}` : "Internal spanel-net only"}
                        </span>
                      </div>
                    </div>

                    {/* Linked Applications Badge */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                        Linked Applications
                      </span>
                      {svc.linked_projects && svc.linked_projects.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {svc.linked_projects.map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-medium"
                            >
                              <FolderGit2 className="w-3 h-3" />
                              <span>{p.name}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">None attached yet</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-3 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        setAttachService(svc);
                        setSelectedProjectId(projects[0]?.id || "");
                      }}
                      className="flex-1 min-w-25 px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                      title="Attach database variables to an application"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Attach</span>
                    </button>

                    <button
                      onClick={() => handleOpenCredentials(svc)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                      title="View Credentials & Laravel .env Config"
                    >
                      <Key className="w-3.5 h-3.5 text-gray-500" />
                      <span>Credentials</span>
                    </button>

                    <button
                      onClick={() => setBackupService(svc)}
                      className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition shadow-2xs cursor-pointer"
                      title="Database Snapshots & Backups"
                    >
                      <HardDrive className="w-4 h-4 text-purple-600" />
                    </button>

                    <button
                      onClick={() => handleRestart(svc)}
                      disabled={isBusy}
                      className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition shadow-2xs cursor-pointer disabled:opacity-50"
                      title="Restart database container"
                    >
                      <RotateCw className={`w-4 h-4 text-gray-600 ${isBusy ? "animate-spin text-indigo-600" : ""}`} />
                    </button>

                    <button
                      onClick={() => setDeleteTarget(svc)}
                      className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-red-50 text-gray-500 hover:text-red-600 transition shadow-2xs cursor-pointer"
                      title="Delete database"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: AVAILABLE DATABASE TEMPLATES */}
      <div className="space-y-4 pt-4">
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            <span>Available Database Templates</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Pre-configured database engines ready for 1-click isolated container deployment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {availableTemplates.map((tmpl) => {
            const isInstalled = installedServices.some(
              (s) => s.service_name.toLowerCase() === tmpl.id.toLowerCase()
            );

            return (
              <div
                key={tmpl.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 shadow-2xs">
                      <Database className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                      {tmpl.category}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-base text-gray-900">{tmpl.name}</h3>
                      <span className="text-xs font-mono text-gray-500">{tmpl.version}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {tmpl.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Networking:</span>
                      <span className="font-mono text-gray-800 font-medium">
                        {tmpl.is_network_daemon ? `Port :${tmpl.port} (Internal)` : "Embedded (File-based)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Persistence:</span>
                      <span className="text-gray-700 truncate max-w-37.5" title={tmpl.persistence}>
                        {tmpl.is_network_daemon ? "Named Docker Vol" : "Local File (WAL)"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleOpenProvisionModal(tmpl)}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isInstalled ? "Provision Additional Instance" : "Provision Database"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: PROVISION DATABASE MODAL */}
      {provisionTemplate && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-gray-900">
                    Provision {provisionTemplate.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Version: {provisionTemplate.version}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProvisionTemplate(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Container &amp; Instance Name
                </label>
                <input
                  type="text"
                  required
                  value={provisionForm.custom_name}
                  onChange={(e) => setProvisionForm({ ...provisionForm, custom_name: e.target.value })}
                  placeholder="e.g. spanel-postgres"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 font-mono text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-2xs"
                />
                <span className="text-[11px] text-gray-400 mt-0.5 block">
                  Other containers on <code className="font-mono text-gray-600">spanel-net</code> will connect using this hostname.
                </span>
              </div>

              {provisionTemplate.id !== "sqlite" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Database Name
                      </label>
                      <input
                        type="text"
                        required
                        value={provisionForm.database_name}
                        onChange={(e) => setProvisionForm({ ...provisionForm, database_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 font-mono text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        required
                        value={provisionForm.username}
                        onChange={(e) => setProvisionForm({ ...provisionForm, username: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 font-mono text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-gray-700">
                        Password (AES-256 Encrypted at Rest)
                      </label>
                      <button
                        type="button"
                        onClick={() => setProvisionForm({ ...provisionForm, password: generateRandomPassword() })}
                        className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium cursor-pointer"
                      >
                        Regenerate Secure Password
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showProvisionPassword ? "text" : "password"}
                        required
                        value={provisionForm.password}
                        onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 font-mono text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none pr-10 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowProvisionPassword(!showProvisionPassword)}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showProvisionPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Public Host Port Exposure Toggle */}
                  <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={provisionForm.expose_host_port}
                        onChange={(e) => setProvisionForm({ ...provisionForm, expose_host_port: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-semibold text-gray-800 block leading-tight">
                          Expose host port (127.0.0.1)
                        </span>
                        <span className="text-[11px] text-gray-500 block mt-0.5">
                          Disabled by default for security. Enable only if you require direct desktop GUI access (DBeaver, TablePlus).
                        </span>
                      </div>
                    </label>

                    {provisionForm.expose_host_port && (
                      <div className="pt-2 pl-6">
                        <label className="block font-medium text-gray-700 mb-1">
                          Host Listening Port
                        </label>
                        <input
                          type="number"
                          value={provisionForm.host_port}
                          onChange={(e) => setProvisionForm({ ...provisionForm, host_port: parseInt(e.target.value) || 0 })}
                          className="w-32 px-3 py-1.5 rounded-md bg-white border border-gray-300 font-mono text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Optional Link to App */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Optional: Automatically link to an application
                </label>
                <select
                  value={provisionForm.attach_project_id}
                  onChange={(e) => setProvisionForm({ ...provisionForm, attach_project_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                >
                  <option value="">None (Standalone Database)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.repo_fullname})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-400 mt-0.5 block">
                  If selected, framework environment variables (DB_HOST, DB_PASSWORD, DATABASE_URL) will be auto-injected.
                </span>
              </div>

              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setProvisionTemplate(null)}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition flex items-center gap-1.5 disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  {isProvisioning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning Docker...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Launch Database</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREDENTIALS & CONNECTION STRINGS MODAL */}
      {viewCreds && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-xl border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-gray-900">
                    Database Credentials &amp; Connection
                  </h3>
                  <p className="text-xs text-gray-500 font-mono uppercase">
                    {credsService?.display_name || viewCreds.service_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewCreds(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
              {/* Internal URI */}
              <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1">
                <span className="text-gray-500 text-[11px] block font-sans font-semibold">
                  Internal Connection URI (For container apps on spanel-net):
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-indigo-700 font-bold break-all">{viewCreds.internal_uri}</span>
                  <button
                    onClick={() => copyToClipboard(viewCreds.internal_uri, "internal_uri")}
                    className="p-1 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-800 shrink-0 cursor-pointer"
                    title="Copy URI"
                  >
                    {copiedKey === "internal_uri" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* External Host URI */}
              <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1">
                <span className="text-gray-500 text-[11px] block font-sans font-semibold">
                  External Host Access:
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-800 break-all">{viewCreds.external_uri}</span>
                  {viewCreds.external_uri.startsWith("postgres://") ||
                  viewCreds.external_uri.startsWith("mysql://") ||
                  viewCreds.external_uri.startsWith("redis://") ? (
                    <button
                      onClick={() => copyToClipboard(viewCreds.external_uri, "external_uri")}
                      className="p-1 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-800 shrink-0 cursor-pointer"
                      title="Copy URI"
                    >
                      {copiedKey === "external_uri" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Laravel / Framework .env copyable block */}
              <div className="p-3.5 rounded-lg bg-gray-900 text-gray-100 space-y-2 border border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-sans font-semibold text-xs flex items-center gap-1.5">
                    <FileCode2 className="w-4 h-4 text-indigo-400" />
                    <span>Framework .env Format (Laravel, Rails, Express, Go)</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(formatLaravelEnvSnippet(viewCreds, credsService), "env_snippet")}
                    className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 font-sans text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "env_snippet" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy .env Block</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[11px] text-gray-300 leading-relaxed overflow-x-auto p-2 bg-black/40 rounded">
                  {formatLaravelEnvSnippet(viewCreds, credsService)}
                </pre>
              </div>

              {/* Raw credentials grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 block font-sans">Host:</span>
                  <span className="text-gray-900 font-semibold">{viewCreds.host}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 block font-sans">Port:</span>
                  <span className="text-gray-900 font-semibold">{viewCreds.port}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 block font-sans">Database:</span>
                  <span className="text-gray-900 font-semibold">{viewCreds.database_name}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 block font-sans">Username:</span>
                  <span className="text-gray-900 font-semibold">{viewCreds.username}</span>
                </div>
                <div className="col-span-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-gray-400 block font-sans">Password:</span>
                    <span className="text-indigo-700 font-bold">
                      {showCredsPassword ? viewCreds.password : "••••••••••••••••••••"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowCredsPassword(!showCredsPassword)}
                      className="p-1 rounded hover:bg-gray-200 text-gray-500 cursor-pointer"
                      title={showCredsPassword ? "Hide password" : "Show password"}
                    >
                      {showCredsPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(viewCreds.password, "pass")}
                      className="p-1 rounded hover:bg-gray-200 text-gray-500 cursor-pointer"
                      title="Copy password"
                    >
                      {copiedKey === "pass" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewCreds(null)}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white font-medium text-xs hover:bg-gray-800 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ATTACH DATABASE TO PROJECT */}
      {attachService && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md border border-gray-200 shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-gray-900">
                    Attach Database to Application
                  </h3>
                  <p className="text-xs text-gray-500 font-mono uppercase">
                    {attachService.display_name || attachService.service_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAttachService(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <Layers className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-sm font-medium text-gray-700">No applications created yet</p>
                <p className="text-xs text-gray-500">Deploy an application first before attaching a database.</p>
              </div>
            ) : (
              <form onSubmit={handleAttachSubmit} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Select Target Application
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.repo_fullname})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 rounded-lg bg-indigo-50 border border-indigo-100 space-y-1.5 text-gray-700">
                  <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Auto-injected Framework Variables:</span>
                  </span>
                  <div className="font-mono text-[11px] text-indigo-800 space-y-0.5 pl-5">
                    {attachService.service_name === "redis" ? (
                      <>
                        <p>• REDIS_HOST={attachService.internal_hostname}</p>
                        <p>• REDIS_PORT={attachService.internal_port}</p>
                        <p>• REDIS_PASSWORD=••••••••</p>
                        <p>• REDIS_URL=redis://:••••••••@{attachService.internal_hostname}:6379/0</p>
                      </>
                    ) : attachService.service_name === "sqlite" ? (
                      <>
                        <p>• DB_CONNECTION=sqlite</p>
                        <p>• DB_DATABASE=/data/sqlite.db</p>
                        <p>• SQLITE_PATH=/data/sqlite.db</p>
                        <p>• Mounted Volume: host ./data/sqlite &rarr; /data</p>
                      </>
                    ) : (
                      <>
                        <p>• DB_CONNECTION={attachService.service_name === "postgresql" ? "pgsql" : "mysql"}</p>
                        <p>• DB_HOST={attachService.internal_hostname}</p>
                        <p>• DB_PORT={attachService.internal_port}</p>
                        <p>• DB_DATABASE=spanel_db</p>
                        <p>• DB_USERNAME=spanel</p>
                        <p>• DB_PASSWORD=••••••••</p>
                        <p>• DATABASE_URL={attachService.service_name}://...@{attachService.internal_hostname}/...</p>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 pt-1">
                    Variables are injected with <strong>Runtime scope</strong> and will take effect on next container start/restart.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAttachService(null)}
                    className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAttaching}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition flex items-center gap-1.5 disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    {isAttaching ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Injecting Variables...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
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

      {/* MODAL 4: DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md border border-gray-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Delete Database Instance?</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {deleteTarget.container_id} ({deleteTarget.service_name})
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              This action will immediately stop and permanently remove the Docker container <strong>{deleteTarget.container_id}</strong>.
              Associated volumes on the host may become orphaned or inaccessible to linked applications.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-xs transition cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50 shadow-2xs cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DATABASE BACKUP & RESTORE MODAL */}
      <DatabaseBackupModal
        isOpen={!!backupService}
        onClose={() => setBackupService(null)}
        service={backupService}
      />
    </div>
  );
};
