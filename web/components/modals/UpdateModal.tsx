import React, { useState } from "react";
import {
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowUpRight,
  ShieldCheck,
  Download,
  Loader2,
} from "lucide-react";
import { VersionInfo } from "@/types";
import { checkForUpdates, triggerSelfUpdate } from "@/lib/api";

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  versionInfo: VersionInfo | null;
  onVersionUpdated: (info: VersionInfo) => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  versionInfo,
  onVersionUpdated,
}) => {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateStep, setUpdateStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  if (!isOpen) return null;

  const handleManualCheck = async () => {
    setChecking(true);
    setErrorMsg(null);
    try {
      const res = await checkForUpdates();
      if (res) {
        onVersionUpdated(res);
      }
    } catch (err) {
      setErrorMsg((err as Error).message || "Gagal memeriksa pembaruan");
    } finally {
      setChecking(false);
    }
  };

  const handleStartUpdate = async () => {
    if (!confirm("Mulai pembaruan sPanel sekarang? Layanan panel akan me-restart secara otomatis.")) {
      return;
    }

    setUpdating(true);
    setErrorMsg(null);
    setUpdateStep("Mengunduh binary Linux terbaru dari GitHub Releases...");

    try {
      const res = await triggerSelfUpdate();
      if (!res.ok) {
        setErrorMsg(res.error || "Gagal melakukan pembaruan");
        setUpdating(false);
        return;
      }

      setUpdateStep("Pembaruan terpasang. Menunggu service restart...");
      setUpdateSuccess(true);

      // Poll /api/health until server is back online
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const ping = await fetch("/api/health", { cache: "no-store" });
          if (ping.ok) {
            clearInterval(interval);
            setUpdateStep("Layanan aktif kembali! Memuat ulang dashboard...");
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        } catch {
          // Still restarting
        }

        if (attempts > 30) {
          clearInterval(interval);
          setUpdateStep("Server memakan waktu lebih lama dari perkiraan. Silakan muat ulang halaman secara manual.");
        }
      }, 2000);
    } catch (err) {
      setErrorMsg((err as Error).message || "Terjadi kesalahan saat pembaruan");
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-linear-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Pembaruan Sistem sPanel</h2>
              <p className="text-xs text-gray-500">Pengecekan versi resmi dari GitHub Releases</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={updating}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Version status card */}
          <div className="bg-gray-50/80 border border-gray-200/70 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Versi Saat Ini
              </span>
              <span className="text-sm font-bold font-mono text-gray-800">
                {versionInfo?.current_version || "v1.0.0"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-gray-400" />
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Versi Terbaru
              </span>
              <span className={`text-sm font-bold font-mono ${versionInfo?.has_update ? "text-indigo-600" : "text-emerald-600"}`}>
                {versionInfo?.latest_version || versionInfo?.current_version || "v1.0.0"}
              </span>
            </div>
          </div>

          {/* Update Status Banner */}
          {versionInfo?.has_update ? (
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Versi Baru Tersedia: {versionInfo.release_name || versionInfo.latest_version}</span>
              </div>
              <p className="text-xs text-indigo-700 leading-relaxed">
                Pembaruan ini mencakup peningkatan performa, perbaikan keamanan, dan fitur terbaru.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900">sPanel Sudah Menggunakan Versi Terbaru</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Server Anda berjalan dengan rilis mutakhir dan aman.
                </p>
              </div>
            </div>
          )}

          {/* Release Notes */}
          {versionInfo?.release_notes && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                Catatan Rilis (Changelog)
              </label>
              <div className="bg-gray-900 text-gray-200 text-xs font-mono p-4 rounded-xl max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-gray-800">
                {versionInfo.release_notes}
              </div>
            </div>
          )}

          {/* Progress / Updating State */}
          {updating && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold">
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                <span>{updateStep}</span>
              </div>
              <div className="w-full bg-amber-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-600 h-full rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Security note */}
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            <span>Verifikasi binary Linux ELF terintegrasi sebelum penggantian.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checking || updating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin text-indigo-600" : "text-gray-500"}`} />
            <span>{checking ? "Memeriksa..." : "Cek Ulang"}</span>
          </button>

          <div className="flex items-center gap-2">
            {versionInfo?.release_url && (
              <a
                href={versionInfo.release_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-gray-600 hover:text-gray-900 text-xs font-medium transition"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            )}

            {versionInfo?.has_update && !updateSuccess && (
              <button
                type="button"
                onClick={handleStartUpdate}
                disabled={updating}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memperbarui...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Update Sekarang</span>
                  </>
                )}
              </button>
            )}

            {!versionInfo?.has_update && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition cursor-pointer"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
