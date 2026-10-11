import React, { useState } from "react";
import { ShieldCheck, KeyRound, Lock, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { rotatePassword } from "@/lib/api";

export const SecuritySettingsView: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Masukkan password saat ini.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password baru harus minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Password baru harus berbeda dari password lama.");
      return;
    }

    setLoading(true);
    try {
      const res = await rotatePassword(currentPassword, newPassword);
      if (res.ok) {
        setSuccess("Password admin berhasil diperbarui! Semua sesi aktif lain telah dicabut (revoked) secara otomatis.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(res.error || "Gagal memperbarui password.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan saat memperbarui password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Rotation Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900">Rotasi Password Administrator</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Ubah password administrator sPanel. Mengubah password akan langsung mencabut (revoke) seluruh token dan sesi aktif lainnya pada browser lain demi integritas keamanan.
            </p>

            <form onSubmit={handleRotate} className="mt-5 space-y-4 max-w-lg">
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Password Saat Ini
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password admin saat ini"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Password Baru (Min. 8 Karakter)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password admin baru"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password admin baru"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                <span>{loading ? "Memproses..." : "Rotasi Password & Cabut Sesi Lain"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Security Architecture Audit Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900">Arsitektur Keamanan sPanel</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Status perlindungan runtime dan kontrol autentikasi web.
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Cookie-Only Authentication
                </p>
                <p className="text-gray-500 mt-1 text-[11px]">
                  Token sesi disimpan secara eksklusif dalam cookie HttpOnly + SameSite=Lax. Token tidak diekspos ke localStorage atau query string.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  CSRF & Origin Validation
                </p>
                <p className="text-gray-500 mt-1 text-[11px]">
                  Semua mutasi HTTP (POST/PUT/DELETE) dan koneksi WebSocket memvalidasi Origin header terhadap Host server sPanel.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Immediate Session Revocation
                </p>
                <p className="text-gray-500 mt-1 text-[11px]">
                  Logout dan rotasi password langsung mencatat timestamp pencabutan sesi di SQLite, memblokir penggunaan ulang token.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Private Network & HTTPS Policy
                </p>
                <p className="text-gray-500 mt-1 text-[11px]">
                  Akses publik diwajibkan menggunakan HTTPS (TLS). Akses unencrypted hanya diizinkan pada jaringan privat terverifikasi (Tailscale/LAN/Loopback).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
