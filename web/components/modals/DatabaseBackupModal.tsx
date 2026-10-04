"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Database,
  RotateCcw,
  Plus,
  Loader2,
  HardDrive,
  Clock,
  FileCheck,
  AlertTriangle,
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
    const data = await fetchMarketplaceBackups(service.id);
    setBackups(data);
    setLoading(false);
  }, [service]);

  useEffect(() => {
    if (isOpen && service) {
      loadBackups();
    }
  }, [isOpen, service, loadBackups]);

  if (!isOpen || !service) return null;

  const handleCreateBackup = async () => {
    setCreating(true);
    setMessage(null);
    const res = await triggerMarketplaceBackup(service.id);
    if (res.ok) {
      setMessage({
        type: "success",
        text: `✓ Snapshot/Backup berhasil dibuat: ${res.data?.filename}`,
      });
      await loadBackups();
    } else {
      setMessage({
        type: "error",
        text: `❌ Gagal membuat backup: ${res.error}`,
      });
    }
    setCreating(false);
  };

  const handleRestore = async (filename: string) => {
    if (
      !confirm(
        `PERINGATAN: Apakah Anda yakin ingin me-restore database dari file "${filename}"? Data saat ini akan ditimpa.`
      )
    ) {
      return;
    }

    setRestoringFile(filename);
    setMessage(null);
    const res = await restoreMarketplaceBackup(service.id, filename);
    if (res.ok) {
      setMessage({
        type: "success",
        text: `✓ Database berhasil di-restore dari snapshot "${filename}"`,
      });
    } else {
      setMessage({
        type: "error",
        text: `❌ Gagal me-restore database: ${res.error}`,
      });
    }
    setRestoringFile(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("id-ID", {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <span>Backup & Snapshot Database</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono uppercase">
                  {service.service_name}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Container: <code className="text-zinc-300">{service.container_id}</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              message.type === "success"
                ? "bg-emerald-950/50 text-emerald-300 border border-emerald-800/60"
                : "bg-red-950/50 text-red-300 border border-red-800/60"
            }`}
          >
            {message.type === "success" ? (
              <FileCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-zinc-500" />
              <span>
                Total Snapshot: <strong className="text-zinc-200">{backups.length}</strong>
              </span>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sedang Membuat Dump...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Buat Backup Baru</span>
                </>
              )}
            </button>
          </div>

          {/* Table of Backups */}
          <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                <span>Memuat riwayat backup...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs space-y-1">
                <Clock className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p>Belum ada file backup / snapshot untuk database ini.</p>
                <p className="text-zinc-600">Klik tombol di atas untuk membuat snapshot pertama.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60 max-h-75 overflow-y-auto">
                {backups.map((b) => (
                  <div
                    key={b.filename}
                    className="p-3.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-zinc-200 flex items-center gap-2">
                        <span>{b.filename}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-sans">
                          {formatSize(b.size)}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(b.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestore(b.filename)}
                        disabled={restoringFile === b.filename}
                        title="Restore database ke snapshot ini"
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {restoringFile === b.filename ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>Restore</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
