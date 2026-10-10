import React, { useState } from "react";
import {
  Search,
  ExternalLink,
  Plus,
  RefreshCw,
  CheckCircle2,
  Lock,
  Globe,
  Key,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { GitHubStatus, GitHubRepo } from "@/types";
import { connectGitHub, disconnectGitHub } from "@/lib/api";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";

interface GitHubViewProps {
  githubStatus?: GitHubStatus | null;
  repos: GitHubRepo[];
  loadingRepos: boolean;
  onRefreshRepos: () => void;
  onDeployRepo: (repo: GitHubRepo) => void;
  onStatusChange: (status: GitHubStatus) => void;
}

export const GitHubView: React.FC<GitHubViewProps> = ({
  githubStatus,
  repos,
  loadingRepos,
  onRefreshRepos,
  onDeployRepo,
  onStatusChange,
}) => {
  const [search, setSearch] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const isConnected = !!githubStatus?.connected;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setConnecting(true);
    setErrorMsg("");

    const res = await connectGitHub(tokenInput.trim());
    setConnecting(false);
    if (res.ok && res.data) {
      onStatusChange(res.data);
      onRefreshRepos();
      setTokenInput("");
    } else {
      setErrorMsg(
        res.error || "Failed to authenticate with GitHub token. Please verify token permissions and expiration."
      );
    }
  };

  const handleConfirmDisconnect = async () => {
    setShowDisconnectConfirm(false);
    const ok = await disconnectGitHub();
    if (ok) {
      onStatusChange({ connected: false });
    }
  };

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">GitHub Integration</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
          Link your GitHub account or Personal Access Token to deploy and trigger automated webhooks.
        </p>
      </div>

      {/* Connection Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold">
              <GithubIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900">
                  {isConnected ? `@${githubStatus?.username || "connected"}` : "GitHub Not Connected"}
                </span>
                {isConnected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Connected</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600">
                {isConnected
                  ? "Access granted to public and private repositories."
                  : "Connect using a Personal Access Token with repo scope."}
              </p>
            </div>
          </div>

          {isConnected ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onRefreshRepos}
                disabled={loadingRepos}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium transition cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRepos ? "animate-spin" : ""}`} />
                <span>Refresh Repos</span>
              </button>
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
              >
                Disconnect
              </button>
            </div>
          ) : null}
        </div>

        {/* Connect Form when not connected */}
        {!isConnected && (
          <form onSubmit={handleConnect} className="pt-3 border-t border-gray-100 space-y-4">
            {/* Scope Guidance Banner */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Required Token Scopes
                </span>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,read:user,admin:repo_hook&description=sPanel%20Server%20Integration"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 underline text-[11px]"
                >
                  <span>Generate Token on GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Ensure your token has <code className="bg-white/80 px-1 py-0.5 rounded border border-indigo-200 font-mono">repo</code> (for private/public repos) and <code className="bg-white/80 px-1 py-0.5 rounded border border-indigo-200 font-mono">read:user</code> permissions.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Personal Access Token (classic or fine-grained)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    aria-label="GitHub Personal Access Token"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 focus:bg-white border border-gray-200 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={connecting || !tokenInput.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                >
                  {connecting ? "Connecting..." : "Connect GitHub"}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Repository Listing */}
      {isConnected && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search repository..."
                aria-label="Search repository"
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs font-sans"
              />
            </div>

            <span className="text-xs text-gray-600">
              Showing {filteredRepos.length} of {repos.length} repositories
            </span>
          </div>

          {loadingRepos ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-2 shadow-2xs">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-gray-600 font-medium">Fetching repositories from GitHub...</p>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center space-y-2 shadow-2xs">
              <p className="text-xs text-gray-600 font-medium">No repositories matched your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:border-gray-300 transition flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-xs text-gray-900 truncate">
                          {repo.name}
                        </span>
                        {repo.private ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-gray-100 text-gray-700">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Private</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-gray-100 text-gray-700">
                            <Globe className="w-2.5 h-2.5" />
                            <span>Public</span>
                          </span>
                        )}
                      </div>

                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-500 hover:text-gray-700 transition"
                        aria-label={`Open ${repo.full_name} on GitHub`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <p className="text-[11px] text-gray-600 line-clamp-2">
                      {repo.description || "No description provided."}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-3 text-gray-500 font-mono text-[10px]">
                      {repo.language && (
                        <span className="text-indigo-600 font-medium">{repo.language}</span>
                      )}
                      <span>branch {repo.default_branch}</span>
                    </div>

                    <button
                      onClick={() => onDeployRepo(repo)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Deploy</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disconnect Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDisconnectConfirm}
        variant="danger"
        title="Disconnect GitHub Integration?"
        description="Disconnecting GitHub will pause automated repository discovery and webhook sync. Running containers and deployed applications will continue running without interruption."
        confirmLabel="Disconnect GitHub"
        cancelLabel="Keep Connected"
        onConfirm={handleConfirmDisconnect}
        onCancel={() => setShowDisconnectConfirm(false)}
      />
    </div>
  );
};
