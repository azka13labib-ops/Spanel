"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Database,
  RotateCcw,
  Plus,
  RefreshCw,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Info,
} from "lucide-react";
import { InstalledService, BackupInfo } from "@/types";
import {
  fetchMarketplaceBackups,
  triggerMarketplaceBackup,
  restoreMarketplaceBackup,
} from "@/lib/api";

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: InstalledService | null;
}

export function DatabaseBackupModal({
  isOpen,
  onClose,
  service,
}: DatabaseBackupModalProps) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadBackups = useCallback(async () => {
    if (!service) return;
    setLoading(true);
    try {
      const data = await fetchMarketplaceBackups(service.id);
      setBackups(data);
    } catch {
      setMessage({ type: "error", text: "Failed to load database snapshots" });
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    let ignore = false;
    if (isOpen && service) {
      fetchMarketplaceBackups(service.id)
        .then((data) => {
          if (!ignore) setBackups(data);
        })
        .catch(() => {
          if (!ignore) setMessage({ type: "error", text: "Failed to load database snapshots" });
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen, service]);

  if (!isOpen || !service) return null;

  const handleCreateBackup = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const res = await triggerMarketplaceBackup(service.id);
      if (res.ok) {
        setMessage({
          type: "success",
          text: `Snapshot created successfully: ${res.data?.filename}`,
        });
        await loadBackups();
      } else {
        setMessage({
          type: "error",
          text: `Failed to create snapshot: ${res.error}`,
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (
      !confirm(
        `CAUTION: Are you sure you want to restore "${filename}"?\n\nExisting database tables and data in the running container will be overwritten with this snapshot.`
      )
    ) {
      return;
    }

    setRestoringFile(filename);
    setMessage(null);
    try {
      const res = await restoreMarketplaceBackup(service.id, filename);
      if (res.ok) {
        setMessage({
          type: "success",
          text: `Database successfully restored from snapshot "${filename}"`,
        });
      } else {
        setMessage({
          type: "error",
          text: `Restore failed: ${res.error}`,
        });
      }
    } finally {
      setRestoringFile(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span>Database Snapshots &amp; Backups</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-medium uppercase border border-indigo-200">
                  {service.display_name || service.service_name}
                </span>
              </h3>
              <p className="text-xs text-gray-500 font-mono">
                Container: {service.container_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Top Actions & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-gray-400" />
              <span>
                Available Snapshots: <strong className="text-gray-900 font-semibold">{backups.length}</strong>
              </span>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer self-start sm:self-auto"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Logical Dump...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Snapshot Now</span>
                </>
              )}
            </button>
          </div>

          {/* Table / List of Backups */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Reading backup archives...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs space-y-1">
                <HardDrive className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="font-semibold text-gray-800">No snapshots recorded for this instance</p>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Click &quot;Create Snapshot Now&quot; above to capture a point-in-time logical backup of your database.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {backups.map((b) => (
                  <div
                    key={b.filename}
                    className="p-3.5 px-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-gray-900 flex items-center gap-2 font-medium">
                        <span>{b.filename}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-sans font-medium">
                          {formatSize(b.size)}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-1.5 font-sans">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(b.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestore(b.filename)}
                        disabled={restoringFile === b.filename}
                        title="Restore database to this snapshot"
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                      >
                        {restoringFile === b.filename ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                        )}
                        <span>Restore</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operational Info Alert */}
          <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-gray-900">Backup Architecture Note:</span>
              <p className="leading-relaxed">
                Snapshots use native database tools (<code>pg_dump</code>, <code>mysqldump</code>, <code>redis SAVE</code>) and are safely stored under <code>./data/backups/</code> on the host VPS. Automatic recurring backup schedules can be bound to the system cron or sPanel queue.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
