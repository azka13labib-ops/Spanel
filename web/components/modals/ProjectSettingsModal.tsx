import React, { useState } from "react";
import { Project } from "@/types";
import {
  X,
  Settings,
  Trash2,
  Save,
  Globe,
  GitBranch,
  Activity,
  ShieldAlert,
  Check,
  Copy,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { deleteProject, updateProject, updateProjectDomain, verifyProjectDomain } from "@/lib/api";

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  hostIp?: string;
  onSuccess: () => void;
}

export function ProjectSettingsModal({
  isOpen,
  onClose,
  project,
  hostIp,
  onSuccess,
}: ProjectSettingsModalProps) {
  const [branch, setBranch] = useState("");
  const [port, setPort] = useState(3000);
  const [healthcheck, setHealthcheck] = useState("/");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    configured: boolean;
    domain?: string;
    server_ip?: string;
    resolved_ips?: string[];
    points_to_server?: boolean;
    status?: "connected" | "pending" | "misconfigured";
    message?: string;
  } | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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
      setVerifyResult(null);
    }
  }

  if (!isOpen || !project) return null;

  const effectiveIp =
    hostIp || (typeof window !== "undefined" ? window.location.hostname : "100.125.7.123");

  const cleanDomain = domain.trim().toLowerCase();
  const domainParts = cleanDomain ? cleanDomain.split(".") : [];
  const isSubdomain = domainParts.length > 2;
  const dnsRecordName = isSubdomain ? domainParts[0] : "@";

  const handleVerifyDns = async () => {
    if (!cleanDomain) {
      alert("Masukkan nama domain terlebih dahulu.");
      return;
    }
    setVerifyLoading(true);
    try {
      const res = await verifyProjectDomain(project.id, cleanDomain);
      setVerifyResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCopyIp = () => {
    navigator.clipboard.writeText(effectiveIp);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

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

      <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
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
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
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
                <p className="text-[11px] text-gray-400">
                  Pushes or webhooks on this branch will trigger automated deployments.
                </p>
              </div>
            </div>

            {/* Custom Domain Section (Vercel-Grade) */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <Globe className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Custom Domain Configuration</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showGuide ? "Tutup Panduan" : "Panduan Pasang Domain"}</span>
                </button>
              </div>

              {/* Step-by-Step Guide Accordion */}
              {showGuide && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-2.5 text-xs text-indigo-950 animate-in fade-in">
                  <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <span>💡 Cara Pasang Domain (.com, .my.id, .id, dll):</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-indigo-900/90">
                    <li>
                      <strong>Beli Domain</strong> di penyedia mana saja (Niagahoster, Domainesia, Rumahweb, Cloudflare, Namecheap, dll).
                    </li>
                    <li>
                      Masuk ke menu <strong>DNS Management</strong> di dashboard registrar Anda.
                    </li>
                    <li>
                      Tambahkan <strong>Record A</strong> baru:
                      <ul className="list-disc list-inside ml-4 mt-1 font-mono text-[10px] space-y-0.5">
                        <li>Untuk domain utama (contoh: <code>azka.com</code>): Name: <code>@</code>, Value: <code>{effectiveIp}</code></li>
                        <li>Untuk subdomain (contoh: <code>app.azka.com</code>): Name: <code>app</code>, Value: <code>{effectiveIp}</code></li>
                      </ul>
                    </li>
                    <li>
                      Ketik nama domain di kolom bawah, simpan, lalu klik <strong>Verifikasi DNS</strong>.
                    </li>
                    <li>
                      <strong>SSL / HTTPS Otomatis:</strong> Jika menggunakan Cloudflare (Proxied / Awan Oranye), domain Anda langsung otomatis terlindungi SSL HTTPS tanpa konfigurasi tambahan!
                    </li>
                  </ol>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Nama Domain Anda</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => {
                      setDomain(e.target.value);
                      setVerifyResult(null);
                    }}
                    placeholder="contoh: portofolio.my.id atau webazka.com"
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyDns}
                    disabled={verifyLoading || !cleanDomain}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition cursor-pointer disabled:opacity-40 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifyLoading ? "animate-spin" : ""}`} />
                    <span>{verifyLoading ? "Memeriksa..." : "Verifikasi DNS"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  Dapat menggunakan domain apa pun (<code>.com</code>, <code>.my.id</code>, <code>.id</code>, <code>.net</code>, atau subdomain).
                </p>
              </div>

              {/* DNS Verification Status & Table */}
              {cleanDomain && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800">Konfigurasi DNS yang Dibutuhkan</span>
                    {verifyResult ? (
                      verifyResult.status === "connected" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Valid & Terhubung</span>
                        </span>
                      ) : verifyResult.status === "misconfigured" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>IP Berbeda ({verifyResult.resolved_ips?.join(", ")})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          <RefreshCw className="w-3 h-3 text-amber-600" />
                          <span>Menunggu Propagasi</span>
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-200 text-gray-700">
                        <span>Belum Dicek</span>
                      </span>
                    )}
                  </div>

                  {/* DNS Record Table */}
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-gray-100/80 text-gray-600 uppercase font-semibold text-[10px] border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2">Tipe</th>
                          <th className="px-3 py-2">Nama (Host)</th>
                          <th className="px-3 py-2">Nilai / Target (IP)</th>
                          <th className="px-3 py-2">TTL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono text-gray-800">
                        <tr>
                          <td className="px-3 py-2.5 font-bold text-indigo-600">A</td>
                          <td className="px-3 py-2.5">{dnsRecordName}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900">{effectiveIp}</span>
                              <button
                                type="button"
                                onClick={handleCopyIp}
                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition cursor-pointer"
                                title="Salin IP"
                              >
                                {copiedIp ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-gray-500">Auto / 60s</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Live Verification Messages */}
                  {verifyResult && (
                    <div
                      className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                        verifyResult.status === "connected"
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                          : verifyResult.status === "misconfigured"
                          ? "bg-rose-50 border border-rose-200 text-rose-800"
                          : "bg-amber-50 border border-amber-200 text-amber-800"
                      }`}
                    >
                      {verifyResult.status === "connected" && (
                        <p className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            Domain <strong>{cleanDomain}</strong> sukses mengarah ke server sPanel ({verifyResult.server_ip})! Nginx reverse proxy telah aktif.
                          </span>
                        </p>
                      )}
                      {verifyResult.status === "misconfigured" && (
                        <p className="flex items-start gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>
                            Domain mengarah ke IP <strong>{verifyResult.resolved_ips?.join(", ")}</strong>, bukan ke IP server ini (<strong>{verifyResult.server_ip}</strong>).
                            Silakan update Record A Anda di DNS Management. <em>(Catatan: Jika memakai Cloudflare Proxy, traffic akan tetap diteruskan jika proxy aktif).</em>
                          </span>
                        </p>
                      )}
                      {verifyResult.status === "pending" && (
                        <p className="flex items-start gap-1.5">
                          <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            DNS belum mendeteksi IP untuk <strong>{cleanDomain}</strong>. Perubahan DNS membutuhkan 1 - 30 menit untuk berpropagasi di internet.
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                  <p className="text-[10px] text-gray-400">
                    Internal port your app listens on (e.g. 3000, 8080, 80).
                  </p>
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
                  <p className="text-[10px] text-gray-400">
                    HTTP path for container uptime checks (e.g. / or /api/health).
                  </p>
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
