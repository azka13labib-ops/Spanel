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
  AlertCircle,
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
  const [importError, setImportError] = useState<string>("");

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
      setImportError("");
    } else {
      setImportError(res.error || "Failed to create project");
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
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl flex flex-col max-h-[90vh] border border-gray-200">
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
                <h3 className="font-semibold text-xl text-gray-900">Configure Project</h3>
                <p className="text-sm text-gray-500 mt-1">Review deployment settings for this repository.</p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  setSelectedRepo(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Selected Repo Card */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded border border-gray-200 bg-white flex items-center justify-center shadow-sm">
                  <GithubIcon className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">{selectedRepo.full_name}</span>
                    {selectedRepo.private ? (
                      <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                        <Lock className="h-3 w-3" />
                        Private
                      </span>
                    ) : (
                      <span className="text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-medium">
                        Public
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Default Branch: {selectedRepo.default_branch || "main"}</p>
                </div>
              </div>
              <a
                href={selectedRepo.html_url}
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-indigo-600 p-2 transition"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <form onSubmit={handleDeploySelected} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name (Slug)</label>
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
                  className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">Branch</label>
                    {loadingBranches && (
                      <span className="text-[10px] text-indigo-600 flex items-center gap-1">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Fetching...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <GitBranch className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={importConfig.branch}
                      onChange={(e) => setImportConfig({ ...importConfig, branch: e.target.value })}
                      className="w-full pl-10 pr-8 py-2 rounded-md bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer font-mono shadow-sm"
                    >
                      {repoBranches.map((br) => (
                         <option key={br} value={br}>
                           {br} {br === selectedRepo.default_branch ? "(default)" : ""}
                         </option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Port</label>
                  <input
                    type="number"
                    required
                    value={importConfig.target_port}
                    onChange={(e) => setImportConfig({ ...importConfig, target_port: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono shadow-sm"
                  />
                </div>
              </div>

              {importConfig.name && (
                <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 text-xs mt-4">
                  <span className="text-gray-500">Generated Magic Staging Domain:</span>
                  <p className="font-mono text-indigo-600 mt-1 font-medium">
                    {importConfig.name}.{hostIP}.sslip.io
                  </p>
                </div>
              )}

              {importError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 mt-4"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => setSelectedRepo(null)}
                  className="px-4 py-2 rounded-md bg-white hover:bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeployingImport}
                  className="px-6 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {isDeployingImport ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
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
            <div className="p-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Import Git Repository</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition cursor-pointer"
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
                      className="flex items-center gap-2.5 px-3.5 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium hover:bg-gray-50 transition text-gray-700 cursor-pointer shadow-sm"
                    >
                      <GithubIcon className="h-4 w-4 text-gray-700" />
                      <span className="font-mono text-sm">{githubStatus.username}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>

                    {accountDropdownOpen && (
                      <div className="absolute left-0 mt-2 w-56 rounded-md bg-white border border-gray-200 shadow-xl p-1 z-50 text-sm">
                        <div className="px-3 py-2 text-gray-500 border-b border-gray-100 font-mono text-xs">
                          Signed in as <b className="text-gray-900">{githubStatus.username}</b>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAccountDropdownOpen(false);
                            onRefreshRepos();
                          }}
                          className="w-full text-left px-3 py-2 mt-1 rounded hover:bg-gray-50 text-gray-700 flex items-center gap-2 transition cursor-pointer"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Refresh Repositories
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAccountDropdownOpen(false);
                            handleDisconnect();
                          }}
                          className="w-full text-left px-3 py-2 rounded hover:bg-red-50 text-red-600 flex items-center gap-2 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                          Disconnect Account
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search repositories..."
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Body: Repos List OR Connect Form */}
            <div className="p-6 overflow-y-auto flex-1">
              {!githubStatus?.connected ? (
                /* Connect GitHub Account Box */
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded border border-gray-200 bg-white flex items-center justify-center shadow-sm">
                      <GithubIcon className="h-6 w-6 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-gray-900">Connect GitHub Account</h3>
                      <p className="text-sm text-gray-500">
                        Connect your GitHub account to view and deploy repositories.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleConnect} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        GitHub Personal Access Token (PAT)
                      </label>
                      <div className="relative">
                        <Key className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="password"
                          required
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={githubTokenInput}
                          onChange={(e) => setGithubTokenInput(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono shadow-sm transition"
                        />
                      </div>
                      {tokenError && <p className="text-xs text-red-600 mt-1.5">{tokenError}</p>}
                    </div>

                    <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 text-sm text-indigo-900 space-y-1.5">
                      <p className="font-semibold">Quick Token Creation:</p>
                      <p>
                        Click the link below to generate a token with the required permissions pre-selected:
                      </p>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=sPanel-PaaS"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-indigo-700 hover:underline font-medium mt-1"
                      >
                        <span>Create Token on GitHub (1-Click)</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setShowManualInput(true)}
                        className="text-sm text-indigo-600 hover:underline cursor-pointer font-medium"
                      >
                        Or import manually
                      </button>
                      <button
                        type="submit"
                        disabled={isConnectingToken}
                        className="px-5 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 font-medium text-sm shadow-sm transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {isConnectingToken ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
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
                      <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mx-auto" />
                      <p className="text-sm text-gray-500">Fetching your repositories from GitHub...</p>
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="p-12 text-center border border-gray-200 rounded-xl bg-gray-50 space-y-2">
                      <FolderGit2 className="h-8 w-8 text-gray-400 mx-auto" />
                      <p className="text-sm font-semibold text-gray-700">No repositories found</p>
                      <p className="text-sm text-gray-500">
                        {repoSearch ? `No matches for "${repoSearch}"` : "Your GitHub account has no repositories."}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100 shadow-sm">
                      {filteredRepos.map((repo) => (
                        <div
                          key={repo.id}
                          className="flex items-center justify-between p-4 hover:bg-gray-50 transition group"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="h-10 w-10 rounded border border-gray-200 bg-white flex items-center justify-center shrink-0 shadow-sm">
                              <FolderGit2 className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition" />
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-gray-900 truncate">
                                  {repo.name}
                                </span>
                                {repo.private && (
                                  <span
                                    className="flex items-center text-gray-400 shrink-0"
                                    title="Private repository"
                                  >
                                    <Lock className="h-3.5 w-3.5" />
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 shrink-0">
                                  <GitBranch className="h-3 w-3" />
                                  {repo.default_branch || "main"}
                                </span>
                                <span className="text-xs text-gray-500 font-normal shrink-0">
                                  · {formatTimeAgo(repo.updated_at)}
                                </span>
                              </div>
                              {repo.description && (
                                <p className="text-xs text-gray-500 truncate max-w-md mt-1">{repo.description}</p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectRepo(repo)}
                            className="shrink-0 ml-4 px-4 py-2 rounded-md bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 hover:text-indigo-600 font-medium text-sm transition shadow-sm cursor-pointer"
                          >
                            Import
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between text-sm text-gray-500">
                    <span>Showing {filteredRepos.length} repositories</span>
                    <button
                      type="button"
                      onClick={() => setShowManualInput(true)}
                      className="hover:text-indigo-600 hover:underline cursor-pointer font-medium"
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
