import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  Lock,
  ChevronDown,
} from "lucide-react";
import { DNSConfig, CloudflareZone, DNSRecordItem } from "@/types";
import {
  fetchDNSConfig,
  saveDNSConfig,
  deleteDNSConfig,
  fetchDNSZones,
  fetchDNSRecords,
  createDNSRecord,
  deleteDNSRecord,
  quickPointDNSRecord,
} from "@/lib/api";

interface DNSManagerViewProps {
  hostIp: string;
}

export const DNSManagerView: React.FC<DNSManagerViewProps> = ({ hostIp }) => {
  const [config, setConfig] = useState<DNSConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [apiTokenInput, setApiTokenInput] = useState<string>("");
  const [savingToken, setSavingToken] = useState<boolean>(false);

  // Cloudflare Zones & Records
  const [zones, setZones] = useState<CloudflareZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<CloudflareZone | null>(null);
  const [records, setRecords] = useState<DNSRecordItem[]>([]);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);

  // New Record Form State
  const [recordType, setRecordType] = useState<string>("A");
  const [recordName, setRecordName] = useState<string>("");
  const [recordValue, setRecordValue] = useState<string>(hostIp || "");
  const [recordTtl, setRecordTtl] = useState<number>(1); // 1 = Auto
  const [recordPriority, setRecordPriority] = useState<string>("");
  const [recordComment, setRecordComment] = useState<string>("");
  const [recordProxied, setRecordProxied] = useState<boolean>(false);
  const [addingRecord, setAddingRecord] = useState<boolean>(false);

  // Quick Point State
  const [quickSubdomain, setQuickSubdomain] = useState<string>("");
  const [quickPointing, setQuickPointing] = useState<boolean>(false);

  // Notifications
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadConfigAndZones = useCallback(async () => {
    setLoadingConfig(true);
    const cfg = await fetchDNSConfig();
    setConfig(cfg);
    setLoadingConfig(false);

    if (cfg?.is_configured) {
      const zList = await fetchDNSZones();
      setZones(zList);
      if (zList.length > 0) {
        setSelectedZone(zList[0]);
      }
    }
  }, []);

  useEffect(() => {
    loadConfigAndZones();
  }, [loadConfigAndZones]);

  // Load records whenever selectedZone changes
  const loadRecords = useCallback(async (zoneId: string) => {
    setLoadingRecords(true);
    const recs = await fetchDNSRecords(zoneId);
    setRecords(recs);
    setLoadingRecords(false);
  }, []);

  useEffect(() => {
    if (selectedZone) {
      loadRecords(selectedZone.id);
    } else {
      setRecords([]);
    }
  }, [selectedZone, loadRecords]);

  // Update default value when record type changes
  const handleTypeChange = (newType: string) => {
    setRecordType(newType);
    if (newType === "A" && (!recordValue || recordValue.includes("."))) {
      setRecordValue(hostIp || "");
    }
  };

  // Connect Cloudflare API Token
  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiTokenInput.trim()) return;

    setSavingToken(true);
    const res = await saveDNSConfig(apiTokenInput.trim());
    if (res.ok) {
      showNotification("success", "Cloudflare API Token berhasil terhubung!");
      setApiTokenInput("");
      await loadConfigAndZones();
    } else {
      showNotification("error", res.error || "Gagal menghubungkan Cloudflare");
    }
    setSavingToken(false);
  };

  // Disconnect Cloudflare
  const handleDisconnect = async () => {
    if (!confirm("Apakah Anda yakin ingin memutuskan integrasi Cloudflare?")) return;
    const res = await deleteDNSConfig();
    if (res.ok) {
      showNotification("success", "Integrasi Cloudflare telah diputus.");
      setConfig({ is_configured: false });
      setZones([]);
      setSelectedZone(null);
      setRecords([]);
    } else {
      showNotification("error", res.error || "Gagal memutuskan integrasi.");
    }
  };

  // Create DNS Record
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) {
      showNotification("error", "Pilih domain terlebih dahulu");
      return;
    }
    if (!recordName.trim()) {
      showNotification("error", "Nama record (subdomain/@) harus diisi");
      return;
    }
    if (!recordValue.trim()) {
      showNotification("error", "Value/Target record harus diisi");
      return;
    }

    setAddingRecord(true);
    const priorityVal = recordType === "MX" && recordPriority ? parseInt(recordPriority, 10) : undefined;

    const res = await createDNSRecord(selectedZone.id, {
      type: recordType,
      name: recordName.trim(),
      content: recordValue.trim(),
      ttl: recordTtl,
      proxied: recordProxied,
      comment: recordComment.trim(),
      priority: priorityVal,
    });

    if (res.ok) {
      showNotification("success", `DNS Record ${recordType} ${recordName} berhasil dibuat!`);
      setRecordName("");
      setRecordComment("");
      if (recordType === "A") setRecordValue(hostIp || "");
      await loadRecords(selectedZone.id);
    } else {
      showNotification("error", res.error || "Gagal membuat record DNS");
    }
    setAddingRecord(false);
  };

  // Delete DNS Record
  const handleDeleteRecord = async (recordId: string, name: string) => {
    if (!selectedZone) return;
    if (!confirm(`Hapus DNS record '${name}'?`)) return;

    const res = await deleteDNSRecord(selectedZone.id, recordId);
    if (res.ok) {
      showNotification("success", `Record '${name}' berhasil dihapus`);
      await loadRecords(selectedZone.id);
    } else {
      showNotification("error", res.error || "Gagal menghapus record");
    }
  };

  // Quick Point to Server IP
  const handleQuickPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) return;

    setQuickPointing(true);
    const res = await quickPointDNSRecord(selectedZone.id, {
      subdomain: quickSubdomain.trim() || "@",
      proxied: false,
      comment: `Auto-point via sPanel to ${hostIp}`,
    });

    if (res.ok) {
      showNotification("success", res.message || "Domain berhasil diarahkan ke sPanel!");
      setQuickSubdomain("");
      await loadRecords(selectedZone.id);
    } else {
      showNotification("error", res.error || "Gagal mengarahkan domain");
    }
    setQuickPointing(false);
  };

  if (loadingConfig) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
        <p className="text-xs">Memuat status DNS...</p>
      </div>
    );
  }

  // View: Not Connected to Cloudflare
  if (!config?.is_configured) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200/90 p-6 sm:p-8 shadow-2xs space-y-6 max-w-3xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-200 shrink-0">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 tracking-tight">
                Hubungkan Cloudflare DNS (Vercel-Style DNS Management)
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Kelola record DNS (A, CNAME, TXT, MX) dan arahkan domain ke sPanel secara instan langsung dari dashboard sPanel,
                sama seperti manajemen DNS di Vercel.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2.5 text-xs text-gray-600">
            <p className="font-semibold text-gray-800 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-indigo-600" />
              <span>Cara mendapatkan Cloudflare API Token:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1">
              <li>
                Buka{" "}
                <a
                  href="https://dash.cloudflare.com/profile/api-tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 font-medium underline inline-flex items-center gap-0.5"
                >
                  <span>Cloudflare API Tokens</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Klik <strong>Create Token</strong> lalu gunakan template <strong>Edit zone DNS</strong>.</li>
              <li>Pilih <strong>All zones</strong> atau domain spesifik yang ingin Anda kelola.</li>
              <li>Klik <strong>Continue to summary</strong> lalu <strong>Create Token</strong> dan copy token Anda.</li>
            </ol>
          </div>

          <form onSubmit={handleSaveToken} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Cloudflare API Token</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={apiTokenInput}
                  onChange={(e) => setApiTokenInput(e.target.value)}
                  placeholder="Contoh: vG7Z... (Cloudflare API Token)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs font-mono transition"
                />
              </div>
              <p className="text-[11px] text-gray-400">
                Token disimpan aman di database host dengan enkripsi <strong>AES-256-GCM</strong>.
              </p>
            </div>

            {notification && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  notification.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {notification.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <span>{notification.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={savingToken || !apiTokenInput.trim()}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingToken ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              <span>{savingToken ? "Memverifikasi ke Cloudflare..." : "Hubungkan Cloudflare"}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // View: Connected to Cloudflare - Vercel DNS Records Interface!
  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 fixed bottom-6 right-6 z-50 shadow-lg border animate-in slide-in-from-bottom-2 ${
            notification.type === "success"
              ? "bg-emerald-900 text-white border-emerald-800"
              : "bg-red-900 text-white border-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Banner & Domain Selector */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-200 shrink-0">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-gray-900 tracking-tight">DNS Records</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloudflare Terhubung
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
                DNS records mengarahkan subdomain atau domain utama Anda ke service sPanel, email, atau third-party.
              </p>
            </div>
          </div>

          {/* Domain Selector & Disconnect */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {zones.length > 0 && (
              <div className="relative">
                <select
                  value={selectedZone?.id || ""}
                  onChange={(e) => {
                    const z = zones.find((item) => item.id === e.target.value);
                    if (z) setSelectedZone(z);
                  }}
                  className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.status})
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <button
              onClick={() => {
                if (selectedZone) loadRecords(selectedZone.id);
              }}
              disabled={loadingRecords}
              className="p-2 text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRecords ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleDisconnect}
              className="px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer"
              title="Putus Cloudflare"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* 1-Click Quick Point Banner */}
        {selectedZone && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
            <div className="flex items-center gap-2 text-xs text-indigo-900">
              <Zap className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                <strong>1-Klik Auto-Point:</strong> Arahkan subdomain di <code>{selectedZone.name}</code> langsung ke IP sPanel (<code>{hostIp}</code>)
              </span>
            </div>
            <form onSubmit={handleQuickPoint} className="flex items-center gap-2 shrink-0">
              <div className="flex items-center border border-indigo-200 bg-white rounded-md px-2 py-1 text-xs">
                <input
                  type="text"
                  value={quickSubdomain}
                  onChange={(e) => setQuickSubdomain(e.target.value)}
                  placeholder="subdomain (misal: app)"
                  className="w-32 focus:outline-none text-xs text-gray-800"
                />
                <span className="text-gray-400 font-mono text-[11px]">.{selectedZone.name}</span>
              </div>
              <button
                type="submit"
                disabled={quickPointing}
                className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50"
              >
                {quickPointing ? "Pointing..." : "Point Now"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Vercel-Style DNS Record Input Form */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-indigo-600" />
            <span>Tambah Record Baru</span>
          </h4>
          <span className="text-[11px] text-gray-400">
            Domain aktif: <strong className="text-gray-700">{selectedZone?.name || "Tidak ada"}</strong>
          </span>
        </div>

        <form onSubmit={handleAddRecord} className="space-y-3">
          {/* Row 1: Name, Type, Value, TTL, Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Name */}
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">Name</label>
              <div className="flex items-center border border-gray-300 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-600 transition bg-white">
                <input
                  type="text"
                  value={recordName}
                  onChange={(e) => setRecordName(e.target.value)}
                  placeholder="subdomain atau @ untuk root"
                  className="w-full focus:outline-none text-xs font-mono text-gray-800"
                />
              </div>
            </div>

            {/* Type */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">Type</label>
              <select
                value={recordType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs font-bold text-gray-800 bg-white cursor-pointer"
              >
                <option value="A">A</option>
                <option value="AAAA">AAAA</option>
                <option value="CNAME">CNAME</option>
                <option value="TXT">TXT</option>
                <option value="MX">MX</option>
                <option value="NS">NS</option>
              </select>
            </div>

            {/* Value */}
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">Value</label>
              <input
                type="text"
                value={recordValue}
                onChange={(e) => setRecordValue(e.target.value)}
                placeholder={recordType === "A" ? hostIp : recordType === "CNAME" ? "target.domain.com" : "Value"}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs font-mono text-gray-800"
              />
            </div>

            {/* TTL */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">TTL</label>
              <select
                value={recordTtl}
                onChange={(e) => setRecordTtl(parseInt(e.target.value, 10))}
                className="w-full px-2 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs text-gray-800 bg-white cursor-pointer"
              >
                <option value={1}>Auto</option>
                <option value={60}>60s</option>
                <option value={300}>5m</option>
                <option value={3600}>1h</option>
              </select>
            </div>
          </div>

          {/* Row 2: Priority (if MX), Comment, Proxy Toggle, Submit Button */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {recordType === "MX" && (
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-gray-600">Priority</label>
                <input
                  type="number"
                  value={recordPriority}
                  onChange={(e) => setRecordPriority(e.target.value)}
                  placeholder="10"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs"
                />
              </div>
            )}

            <div className={recordType === "MX" ? "sm:col-span-6 space-y-1" : "sm:col-span-8 space-y-1"}>
              <label className="text-[11px] font-semibold text-gray-600">Comment (Opsional)</label>
              <input
                type="text"
                value={recordComment}
                onChange={(e) => setRecordComment(e.target.value)}
                placeholder="Penjelasan kegunaan DNS record ini (contoh: App frontend portofolio)"
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-gray-800"
              />
            </div>

            {/* Cloudflare Proxy Toggle */}
            <div className="sm:col-span-2 flex items-center gap-2 pb-2">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={recordProxied}
                  onChange={(e) => setRecordProxied(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={recordProxied ? "font-bold text-orange-600" : "text-gray-500"}>
                  {recordProxied ? "Proxied ☁️" : "DNS Only ☁️"}
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={addingRecord || !recordName.trim() || !recordValue.trim()}
                className="w-full py-2 px-3 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {addingRecord ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span>Add Record</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Vercel-Style DNS Records Table */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-gray-700">Daftar DNS Records</span>
            <span className="text-xs text-gray-500">({records.length} records)</span>
          </div>
          <span className="text-xs text-gray-400">Zone ID: {selectedZone?.id}</span>
        </div>

        {loadingRecords ? (
          <div className="py-12 text-center text-gray-500">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
            <p className="text-xs">Mengambil records dari Cloudflare...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            Tidak ada DNS record yang ditemukan di domain ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-200/80">
                <tr>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-4">Value</th>
                  <th className="py-2.5 px-3">TTL</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4">Comment</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => {
                  const typeColors: Record<string, string> = {
                    A: "bg-blue-50 text-blue-700 border-blue-200",
                    AAAA: "bg-indigo-50 text-indigo-700 border-indigo-200",
                    CNAME: "bg-purple-50 text-purple-700 border-purple-200",
                    TXT: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    MX: "bg-amber-50 text-amber-700 border-amber-200",
                    NS: "bg-gray-100 text-gray-700 border-gray-200",
                  };
                  const colorClass = typeColors[r.type] || "bg-gray-50 text-gray-700 border-gray-200";

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-gray-900">{r.name}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${colorClass}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-700 break-all max-w-xs">{r.content}</td>
                      <td className="py-3 px-3 text-gray-500">{r.ttl === 1 ? "Auto" : `${r.ttl}s`}</td>
                      <td className="py-3 px-3">
                        {r.proxied ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                            Proxied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            DNS Only
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-400 italic">{r.comment || "-"}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteRecord(r.id, r.name)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                          title="Hapus Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
