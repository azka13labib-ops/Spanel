import React, { useState } from "react";
import {
  ArrowLeft,
  Lock,
  ExternalLink,
  GitBranch,
  RefreshCw,
  ChevronDown,
  Play,
  Search,
  Key,
  Check,
  FolderGit2,
  Trash2,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { GitHubRepo, GitHubStatus, Project } from "@/types";
import { formatTimeAgo } from "@/lib/utils";
import {
  connectGitHub,
  disconnectGitHub,
  fetchGitHubBranches,
  createProject,
} from "@/lib/api";

interface ImportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostIP: string;
  onProjectCreated: (project: Project, shouldDeploy?: boolean) => void;
  githubStatus: GitHubStatus | null;
  onGitHubStatusChange: (status: GitHubStatus) => void;
  githubRepos: GitHubRepo[];
  loadingRepos: boolean;
  onRefreshRepos: () => void;
}

export const ImportProjectModal: React.FC<ImportProjectModalProps> = ({
  isOpen,
  onClose,
  hostIP,
  onProjectCreated,
  githubStatus,
  onGitHubStatusChange,
  githubRepos,
  loadingRepos,
  onRefreshRepos,
}) => {
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [repoSearch, setRepoSearch] = useState<string>("");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState<boolean>(false);

  // GitHub Connect form
  const [githubTokenInput, setGithubTokenInput] = useState<string>("");
  const [isConnectingToken, setIsConnectingToken] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string>("");

  // Repo configuration form
  const [importConfig, setImportConfig] = useState({
    name: "",
    branch: "main",
    target_port: 3000,
  });
  const [repoBranches, setRepoBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);
  const [isDeployingImport, setIsDeployingImport] = useState<boolean>(false);

  // Manual fallback form
  const [manualProject, setManualProject] = useState({
    name: "",
    repo_fullname: "",
    branch: "main",
    target_port: 3000,
  });

  if (!isOpen) return null;

  const handleSelectRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    const defBranch = repo.default_branch || "main";
    setImportConfig({
      name: repo.name.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      branch: defBranch,
      target_port: 3000,
    });

    const parts = repo.full_name.split("/");
    if (parts.length === 2) {
      setLoadingBranches(true);
      setRepoBranches([defBranch]);
      const branches = await fetchGitHubBranches(parts[0], parts[1]);
      if (branches.length > 0) {
        setRepoBranches(Array.from(new Set([defBranch, ...branches])));
      }
      setLoadingBranches(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubTokenInput.trim()) return;
    setIsConnectingToken(true);
    setTokenError("");

    const res = await connectGitHub(githubTokenInput);
    if (res.ok && res.data) {
      onGitHubStatusChange(res.data);
      setGithubTokenInput("");
      onRefreshRepos();
    } else {
      setTokenError(res.error || "Gagal menghubungkan token GitHub.");
    }
    setIsConnectingToken(false);
  };

  const handleDisconnect = async () => {
    await disconnectGitHub();
    onGitHubStatusChange({ connected: false });
    setSelectedRepo(null);
  };

  const handleDeploySelected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) return;
    setIsDeployingImport(true);

    const res = await createProject({
      name: importConfig.name,
      repo_fullname: selectedRepo.full_name,
      branch: importConfig.branch,
      target_port: Number(importConfig.target_port),
      healthcheck_path: "/",
    });

    if (res.ok && res.data) {
      onProjectCreated(res.data, true);
      onClose();
      setSelectedRepo(null);
    } else {
      alert(`Error: ${res.error || "Failed to create project"}`);
    }
    setIsDeployingImport(false);
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProject.name || !manualProject.repo_fullname) return;

    const res = await createProject(manualProject);
    if (res.ok && res.data) {
      onProjectCreated(res.data, false);
    } else {
      // Local fallback
      const localProj: Project = {
        id: `proj-${Date.now()}`,
        name: manualProject.name,
        repo_fullname: manualProject.repo_fullname,
        branch: manualProject.branch,
        magic_domain: `${manualProject.name}.${hostIP}.sslip.io`,
        target_port: Number(manualProject.target_port),
        healthcheck_path: "/",
        status: "running",
        created_at: new Date().toISOString(),
      };
      onProjectCreated(localProj, false);
    }

    onClose();
    setManualProject({ name: "", repo_fullname: "", branch: "main", target_port: 3000 });
  };

  const filteredRepos = githubRepos.filter((r) => {
    if (!repoSearch.trim()) return true;
    const q = repoSearch.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.full_name.toLowerCase().includes(q) ||
      (r.language && r.language.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl w-full max-w-2xl overflow-hidden border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        {selectedRepo ? (
          /* Configure & Deploy Screen */
          <div className="p-6 space-y-6 overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedRepo(null)}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to repositories
            </button>

            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-xl text-white">Configure Project</h3>
                <p className="text-xs text-slate-400 mt-1">Review deployment settings for this repository.</p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  setSelectedRepo(null);
                }}
                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Selected Repo Card */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/3 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center">
                  <GithubIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{selectedRepo.full_name}</span>
                    {selectedRepo.private ? (
                      <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                        <Lock className="h-3 w-3" />
                        Private
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                        Public
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Default Branch: {selectedRepo.default_branch || "main"}</p>
                </div>
              </div>
              <a
                href={selectedRepo.html_url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-cyan-400 p-2"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <form onSubmit={handleDeploySelected} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Project Name (Slug)</label>
                <input
                  type="text"
                  required
                  value={importConfig.name}
                  onChange={(e) =>
                    setImportConfig({
                      ...importConfig,
                      name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">Branch</label>
                    {loadingBranches && (
                      <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Fetching...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <GitBranch className="h-4 w-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={importConfig.branch}
                      onChange={(e) => setImportConfig({ ...importConfig, branch: e.target.value })}
                      className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-black/60 border border-white/10 text-sm text-white focus:border-cyan-400 outline-none appearance-none cursor-pointer font-mono"
                    >
                      {repoBranches.map((br) => (
                        <option key={br} value={br} className="bg-[#0e121a] text-white">
                          {br} {br === selectedRepo.default_branch ? "(default)" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Port</label>
                  <input
                    type="number"
                    required
                    value={importConfig.target_port}
                    onChange={(e) => setImportConfig({ ...importConfig, target_port: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white font-mono"
                  />
                </div>
              </div>

              {importConfig.name && (
                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs">
                  <span className="text-slate-400">Generated Magic Staging Domain:</span>
                  <p className="font-mono text-cyan-400 mt-1 font-semibold">
                    {importConfig.name}.{hostIP}.sslip.io
                  </p>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedRepo(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeployingImport}
                  className="px-6 py-2.5 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isDeployingImport ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-black" />
                      <span>Deploy</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : showManualInput ? (
          /* Manual Input Fallback */
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-white">Manual Git Import</h3>
              <button
                onClick={() => setShowManualInput(false)}
                className="text-xs text-cyan-400 hover:underline cursor-pointer"
              >
                ← Back to GitHub Import
              </button>
            </div>
            <form onSubmit={handleCreateManual} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Project Name (Slug)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. my-awesome-app"
                  value={manualProject.name}
                  onChange={(e) =>
                    setManualProject({
                      ...manualProject,
                      name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Repository Full Name (Owner/Repo)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. username/repo"
                  value={manualProject.repo_fullname}
                  onChange={(e) => setManualProject({ ...manualProject, repo_fullname: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Branch</label>
                  <input
                    type="text"
                    value={manualProject.branch}
                    onChange={(e) => setManualProject({ ...manualProject, branch: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target Port</label>
                  <input
                    type="number"
                    value={manualProject.target_port}
                    onChange={(e) => setManualProject({ ...manualProject, target_port: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white font-mono"
                  />
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 text-black font-semibold text-xs shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  Create &amp; Provision
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Vercel-style Import Git Repository view */
          <div className="flex flex-col h-full max-h-[85vh]">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold tracking-tight text-white">Import Git Repository</h2>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Top Bar: Account Dropdown & Search Input */}
              {githubStatus?.connected ? (
                <div className="flex items-center gap-3">
                  {/* GitHub Account Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                      className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-sm font-medium hover:border-white/30 transition text-white cursor-pointer"
                    >
                      <GithubIcon className="h-4 w-4 text-white" />
                      <span className="font-mono text-xs">{githubStatus.username}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>

                    {accountDropdownOpen && (
                      <div className="absolute left-0 mt-2 w-56 rounded-xl bg-[#0e121a] border border-white/10 shadow-2xl p-1.5 z-50 text-xs">
                        <div className="px-3 py-2 text-slate-400 border-b border-white/5 font-mono">
                          Signed in as <b className="text-white">{githubStatus.username}</b>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAccountDropdownOpen(false);
                            onRefreshRepos();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white flex items-center gap-2 transition cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Refresh Repositories
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAccountDropdownOpen(false);
                            handleDisconnect();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 flex items-center gap-2 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Disconnect Account
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search"
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder-slate-500 outline-none focus:border-white/40 transition"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Body: Repos List OR Connect Form */}
            <div className="p-6 overflow-y-auto flex-1">
              {!githubStatus?.connected ? (
                /* Connect GitHub Account Box */
                <div className="rounded-2xl border border-white/10 bg-black/40 p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <GithubIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">Connect GitHub Account</h3>
                      <p className="text-xs text-slate-400">
                        Hubungkan akun GitHub lu untuk melihat &amp; deploy semua repository publik maupun <b>private</b>.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleConnect} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        GitHub Personal Access Token (PAT)
                      </label>
                      <div className="relative">
                        <Key className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="password"
                          required
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={githubTokenInput}
                          onChange={(e) => setGithubTokenInput(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-400 font-mono transition"
                        />
                      </div>
                      {tokenError && <p className="text-xs text-red-400 mt-1.5">{tokenError}</p>}
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/2 border border-white/5 text-xs text-slate-400 space-y-1.5">
                      <p className="font-semibold text-slate-300">💡 Cara cepat buat token GitHub:</p>
                      <p>
                        Klik link di bawah untuk langsung membuka halaman token GitHub dengan izin <code>repo</code> yang sudah tercentang otomatis:
                      </p>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=sPanel-PaaS"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline font-medium mt-1"
                      >
                        <span>👉 Buat Token di GitHub (1-Click Preset)</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setShowManualInput(true)}
                        className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Atau input URL manual tanpa login
                      </button>
                      <button
                        type="submit"
                        disabled={isConnectingToken}
                        className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-slate-200 font-semibold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {isConnectingToken ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Menghubungkan...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Connect GitHub</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Connected: Exact Vercel Repository List */
                <div className="space-y-4">
                  {loadingRepos ? (
                    <div className="p-12 text-center space-y-3">
                      <RefreshCw className="h-6 w-6 text-cyan-400 animate-spin mx-auto" />
                      <p className="text-xs text-slate-400">Fetching your repositories from GitHub...</p>
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="p-12 text-center border border-white/10 rounded-2xl bg-black/40 space-y-2">
                      <FolderGit2 className="h-8 w-8 text-slate-500 mx-auto" />
                      <p className="text-sm font-semibold text-slate-300">No repositories found</p>
                      <p className="text-xs text-slate-500">
                        {repoSearch ? `No matches for "${repoSearch}"` : "Your GitHub account has no repositories."}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-[#07090e] overflow-hidden divide-y divide-white/5">
                      {filteredRepos.map((repo) => (
                        <div
                          key={repo.id}
                          className="flex items-center justify-between p-3.5 px-4 hover:bg-white/3 transition group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <FolderGit2 className="h-4 w-4 text-slate-400 group-hover:text-cyan-400 transition" />
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white truncate">
                                  {repo.name}
                                </span>
                                {repo.private && (
                                  <span
                                    className="flex items-center text-slate-400 shrink-0"
                                    title="Private repository"
                                  >
                                    <Lock className="h-3 w-3" />
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 shrink-0">
                                  <GitBranch className="h-3 w-3" />
                                  {repo.default_branch || "main"}
                                </span>
                                <span className="text-xs text-slate-500 font-normal shrink-0">
                                  · {formatTimeAgo(repo.updated_at)}
                                </span>
                              </div>
                              {repo.description && (
                                <p className="text-xs text-slate-400 truncate max-w-md">{repo.description}</p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectRepo(repo)}
                            className="shrink-0 ml-4 px-4 py-1.5 rounded-lg bg-white text-black hover:bg-slate-200 font-semibold text-xs transition active:scale-95 shadow-sm cursor-pointer"
                          >
                            Import
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Showing {filteredRepos.length} repositories</span>
                    <button
                      type="button"
                      onClick={() => setShowManualInput(true)}
                      className="hover:text-cyan-400 hover:underline cursor-pointer"
                    >
                      Import third-party Git URL →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
