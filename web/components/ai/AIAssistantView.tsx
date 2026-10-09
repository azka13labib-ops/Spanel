import React, { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Sparkles,
  Key,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Trash2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Lock,
  Cpu,
  Zap,
} from "lucide-react";
import { AIConfig } from "@/types";
import { fetchAIConfig, saveAIConfig, deleteAIConfig, testAIConfig } from "@/lib/api";

export const AIAssistantView: React.FC = () => {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  const [apiKey, setApiKey] = useState<string>("");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    const cfg = await fetchAIConfig();
    if (cfg) {
      setConfig(cfg);
      if (cfg.provider_name === "openai" || cfg.provider_name === "gemini") {
        setProvider(cfg.provider_name);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setStatusMessage({ type: "error", text: "Silakan masukkan API Key terlebih dahulu." });
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setTestResult(null);

    const res = await saveAIConfig({
      provider_name: provider,
      api_key: apiKey.trim(),
    });

    if (res.ok) {
      setStatusMessage({
        type: "success",
        text: res.message || "Kunci AI berhasil disimpan dengan enkripsi AES-256-GCM!",
      });
      setApiKey("");
      await loadConfig();
    } else {
      setStatusMessage({ type: "error", text: res.error || "Gagal menyimpan API Key." });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setStatusMessage(null);

    const res = await testAIConfig({
      provider_name: provider,
      api_key: apiKey.trim() || undefined,
    });

    if (res.ok) {
      setTestResult({ ok: true, message: res.message || "Koneksi berhasil diverifikasi!" });
    } else {
      setTestResult({ ok: false, message: res.error || "Gagal menguji koneksi API." });
    }
    setTesting(false);
  };

  const handleDelete = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus API Key AI yang tersimpan?")) {
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setTestResult(null);

    const res = await deleteAIConfig();
    if (res.ok) {
      setStatusMessage({ type: "success", text: "Konfigurasi AI berhasil dihapus." });
      setApiKey("");
      await loadConfig();
    } else {
      setStatusMessage({ type: "error", text: res.error || "Gagal menghapus API Key." });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-6 sm:p-7 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-600 text-white shadow-sm shrink-0">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-bold text-lg text-gray-900 tracking-tight">
                  Autonomous AI Sysadmin (BYOK)
                </h3>
                {config?.is_configured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Aktif ({config.provider_name?.toUpperCase()})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Belum Dikonfigurasi
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                Mendiagnosis kegagalan deployment secara otonom, menyensor rahasia (secrets/tokens) sebelum dikirim,
                dan memberikan rekomendasi konfigurasi atau perbaikan kode 1-klik.
              </p>
            </div>
          </div>

          <button
            onClick={loadConfig}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200/80 transition cursor-pointer"
            title="Refresh status AI"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Status Callout if Configured */}
        {config?.is_configured && (
          <div className="mt-5 p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                API Key aktif tersimpan aman untuk provider <strong>{config.provider_name?.toUpperCase()}</strong>:{" "}
                <code className="px-1.5 py-0.5 rounded bg-emerald-100 font-mono text-emerald-800">
                  {config.masked_key}
                </code>
              </span>
            </div>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus Kunci</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Configuration Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-6 sm:p-7 shadow-2xs space-y-6">
        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Key className="h-4 w-4 text-indigo-600" />
            <span>Konfigurasi API Key (Bring Your Own Key)</span>
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Pilih provider model AI dan masukkan API Key Anda. Kunci Anda akan dienkripsi dengan <strong>AES-256-GCM</strong> di SQLite host.
          </p>
        </div>

        {/* Step 1: Provider Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">1. Pilih Provider Model AI</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => {
                setProvider("gemini");
                setTestResult(null);
              }}
              className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                provider === "gemini"
                  ? "border-indigo-600 bg-indigo-50/40 shadow-xs"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  provider === "gemini" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900">Google Gemini</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Rekomendasi (Free Tier)
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Model <code>gemini-1.5-flash</code>. Gratis dan kuota tinggi untuk diagnosis DevOps.
                </p>
              </div>
            </div>

            <div
              onClick={() => {
                setProvider("openai");
                setTestResult(null);
              }}
              className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                provider === "openai"
                  ? "border-indigo-600 bg-indigo-50/40 shadow-xs"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  provider === "openai" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                <Cpu className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900">OpenAI</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    GPT-4o Mini
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Model <code>gpt-4o-mini</code>. Cepat dan akurat dengan format JSON native.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Input API Key */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">
                2. Masukkan API Key ({provider === "gemini" ? "Google Gemini" : "OpenAI"})
              </label>
              {provider === "gemini" ? (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 hover:underline"
                >
                  <span>Dapatkan API Key gratis di Google AI Studio</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 hover:underline"
                >
                  <span>Dapatkan API Key di OpenAI Platform</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  provider === "gemini"
                    ? "Contoh: AIzaSyD..."
                    : "Contoh: sk-proj-..."
                }
                className="w-full pl-9 pr-20 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs font-mono transition"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition cursor-pointer text-xs"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              {config?.is_configured && !apiKey
                ? "💡 API Key sudah tersimpan di database. Anda bisa langsung menekan tombol 'Test Koneksi' di bawah untuk menguji."
                : "Kunci API hanya disimpan di server pribadi Anda dan tidak akan pernah dibagikan ke pihak ketiga."}
            </p>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3.5 rounded-lg border flex items-start gap-3 text-xs animate-in fade-in duration-200 ${
                testResult.ok
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-semibold">{testResult.ok ? "Verifikasi Berhasil" : "Verifikasi Gagal"}: </span>
                <span>{testResult.message}</span>
              </div>
            </div>
          )}

          {/* Status Alert Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-lg border flex items-start gap-3 text-xs animate-in fade-in duration-200 ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {statusMessage.type === "success" ? (
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span>{statusMessage.text}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || (!apiKey.trim() && !config?.is_configured)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-amber-500" />
              )}
              <span>{testing ? "Menguji Koneksi..." : "Test Koneksi AI"}</span>
            </button>

            <button
              type="submit"
              disabled={saving || !apiKey.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              <span>{saving ? "Menyimpan..." : "Simpan API Key"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security & Reliability Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-gray-800">Zero-Leak Secret Redactor</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Menyaring kata sandi database, GitHub token, dan variabel lingkungan sebelum log dikirim ke AI provider.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200/60">
              <Zap className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-gray-800">Loop Breaker Guard (Max 3)</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Membatasi proses perbaikan otomatis hingga maksimal 3 kali untuk menghindari pemborosan token API jika terjadi error permanen.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200/60">
              <Bot className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-gray-800">Supervised 1-Click Fix</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Setiap rekomendasi perbaikan konfigurasi port atau variabel lingkungan meminta persetujuan 1-klik sebelum diterapkan ke container.
          </p>
        </div>
      </div>
    </div>
  );
};
