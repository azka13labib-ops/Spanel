import React, { useState } from 'react';

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isSetupMode, setIsSetupMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setError('');

    try {
      if (isSetupMode) {
        const setupRes = await fetch('/api/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: token })
        });

        if (setupRes.ok) {
          localStorage.setItem('spanel_token', token);
          onLogin();
          return;
        } else {
          const data = await setupRes.json().catch(() => ({}));
          setError(data.error || "Gagal mengatur password. Pastikan minimal 8 karakter.");
          setLoading(false);
          return;
        }
      }

      await fetch('/api/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      // Test the token against a protected endpoint to verify it
      const checkRes = await fetch('/api/system/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (checkRes.ok) {
        localStorage.setItem('spanel_token', token);
        onLogin();
      } else {
        const data = await checkRes.json().catch(() => ({}));
        if (data?.error === "SETUP_REQUIRED") {
            setIsSetupMode(true);
            setToken('');
            setError('');
        } else {
            setError("Token Admin tidak valid. Silakan coba lagi.");
        }
      }
    } catch {
      setError("Gagal terhubung ke server sPanel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070a] text-slate-100 p-4">
      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isSetupMode ? "Buat Password Admin" : "Login ke sPanel"}
          </h1>
          <p className="text-slate-400 text-sm">
            {isSetupMode 
              ? "Instalasi sPanel baru terdeteksi. Silakan buat password admin pertama Anda (minimal 8 karakter)."
              : "Dasbor ini diamankan oleh Sistem Autentikasi Global. Masukkan Password Admin Anda untuk melanjutkan."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {isSetupMode ? "Password Baru" : "Password Admin"}
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{isSetupMode ? "Simpan Password" : "Masuk Dasbor"}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
