"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  Cpu,
  Layers,
  Terminal,
  Activity,
  Plus,
  RefreshCw,
  RotateCcw,
  ExternalLink,
  Bot,
  Database,
  ShieldCheck,
  CheckCircle2,
  Play,
  Trash2,
  FolderGit2,
  Search,
  Lock,
  ChevronDown,
  Check,
  ArrowLeft,
  Key,
  GitBranch
} from "lucide-react";

const GithubIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string;
  default_branch: string;
  language: string;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface Project {
  id: string;
  name: string;
  repo_fullname: string;
  branch: string;
  custom_domain?: string;
  magic_domain?: string;
  target_port: number;
  healthcheck_path: string;
  status: string;
  created_at: string;
}

interface SystemMetrics {
  os: string;
  arch: string;
  num_cpu: number;
  alloc_mb: number;
  sys_mb: number;
  goroutines: number;
  host_ip: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"projects" | "marketplace" | "ai" | "server">("projects");
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "proj-1",
      name: "azka-floatee-web",
      repo_fullname: "azka-labib/azka-floatee-web",
      branch: "main",
      magic_domain: "azka-floatee-web.127.0.0.1.sslip.io",
      target_port: 3000,
      healthcheck_path: "/",
      status: "running",
      created_at: new Date().toISOString(),
    },
    {
      id: "proj-2",
      name: "payment-service-go",
      repo_fullname: "azka-labib/payment-service-go",
      branch: "production",
      magic_domain: "payment-service-go.127.0.0.1.sslip.io",
      target_port: 8080,
      healthcheck_path: "/healthz",
      status: "running",
      created_at: new Date().toISOString(),
    }
  ]);

  const [metrics, setMetrics] = useState<SystemMetrics>({
    os: "linux",
    arch: "amd64",
    num_cpu: 4,
    alloc_mb: 28,
    sys_mb: 64,
    goroutines: 12,
    host_ip: "127.0.0.1",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    repo_fullname: "",
    branch: "main",
    target_port: 3000,
  });

  // GitHub Integration State
  const [githubStatus, setGithubStatus] = useState<{ connected: boolean; username?: string; avatar_url?: string } | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [repoSearch, setRepoSearch] = useState<string>("");
  const [githubTokenInput, setGithubTokenInput] = useState<string>("");
  const [isConnectingToken, setIsConnectingToken] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string>("");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState<boolean>(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [isDeployingImport, setIsDeployingImport] = useState<boolean>(false);
  const [importConfig, setImportConfig] = useState({
    name: "",
    branch: "main",
    target_port: 3000,
  });

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [activeLogProject, setActiveLogProject] = useState<string>("");
  const [deployLogs, setDeployLogs] = useState<string[]>([
    "=== [sPanel Ephemeral Builder] ===",
    "[Nixpacks] Detecting language: Node.js (Next.js)",
    "[Nixpacks] Generating build plan...",
    "[Nixpacks] Building in ephemeral container...",
    "[Docker] Tagging image: spanel-azka-floatee-web:latest",
    "[Traefik] Injecting label: traefik.http.routers.app.rule=Host(`azka-floatee-web.127.0.0.1.sslip.io`)",
    "[Healthcheck] Probing http://container:3000/ -> 200 OK (passed in 420ms)",
    "[Traffic] Switching Traefik router to container v2",
    "[Janitor] Cleaned up container v1 smoothly",
    "✅ Deployment healthy and online!"
  ]);

  const checkGitHubStatus = async () => {
    try {
      const res = await fetch("/api/github/status");
      if (res.ok) {
        const data = await res.json();
        setGithubStatus(data);
        if (data.connected) {
          fetchGitHubRepos();
        }
      }
    } catch {}
  };

  const fetchGitHubRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/github/repos");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setGithubRepos(data);
        }
      }
    } catch {} finally {
      setLoadingRepos(false);
    }
  };

  const handleConnectGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubTokenInput.trim()) return;
    setIsConnectingToken(true);
    setTokenError("");
    try {
      const res = await fetch("/api/github/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: githubTokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTokenError(data.error || "Gagal menghubungkan token GitHub.");
      } else {
        setGithubStatus({ connected: true, username: data.username, avatar_url: data.avatar_url });
        setGithubTokenInput("");
        fetchGitHubRepos();
      }
    } catch (err: unknown) {
      setTokenError((err as Error).message || "Gagal menghubungi server");
    } finally {
      setIsConnectingToken(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      await fetch("/api/github/disconnect", { method: "POST" });
      setGithubStatus({ connected: false });
      setGithubRepos([]);
      setSelectedRepo(null);
    } catch {}
  };

  const [repoBranches, setRepoBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);

  const fetchBranches = async (owner: string, repo: string, defaultBranch: string) => {
    setLoadingBranches(true);
    setRepoBranches([defaultBranch || "main"]);
    try {
      const res = await fetch(`/api/github/repos/${owner}/${repo}/branches`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((b: { name: string }) => b.name);
          const sorted = Array.from(new Set([defaultBranch || "main", ...names]));
          setRepoBranches(sorted);
        }
      }
    } catch {} finally {
      setLoadingBranches(false);
    }
  };

  const handleSelectRepo = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    const defBranch = repo.default_branch || "main";
    setImportConfig({
      name: repo.name.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      branch: defBranch,
      target_port: 3000,
    });
    const parts = repo.full_name.split("/");
    if (parts.length === 2) {
      fetchBranches(parts[0], parts[1], defBranch);
    }
  };

  const handleDeployImportedProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) return;
    setIsDeployingImport(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: importConfig.name,
          repo_fullname: selectedRepo.full_name,
          branch: importConfig.branch,
          target_port: Number(importConfig.target_port),
          healthcheck_path: "/",
        }),
      });

      if (res.ok) {
        const createdProject = await res.json();
        setProjects((prev) => [createdProject, ...prev]);
        setIsModalOpen(false);
        setSelectedRepo(null);
        triggerDeploy(createdProject);
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || "Failed to create project"}`);
      }
    } catch (err: unknown) {
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setIsDeployingImport(false);
    }
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

  // Fetch metrics from backend
  useEffect(() => {
    fetch("/api/system/metrics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setMetrics(data);
      })
      .catch(() => {});

    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setProjects(data);
        }
      })
      .catch(() => {});

    checkGitHubStatus();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.repo_fullname) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      if (res.ok) {
        const created = await res.json();
        setProjects([created, ...projects]);
      } else {
        // Fallback local state
        const localProj: Project = {
          id: `proj-${Date.now()}`,
          name: newProject.name,
          repo_fullname: newProject.repo_fullname,
          branch: newProject.branch,
          magic_domain: `${newProject.name}.${metrics.host_ip}.sslip.io`,
          target_port: Number(newProject.target_port),
          healthcheck_path: "/",
          status: "running",
          created_at: new Date().toISOString(),
        };
        setProjects([localProj, ...projects]);
      }
    } catch {
      const localProj: Project = {
        id: `proj-${Date.now()}`,
        name: newProject.name,
        repo_fullname: newProject.repo_fullname,
        branch: newProject.branch,
        magic_domain: `${newProject.name}.${metrics.host_ip}.sslip.io`,
        target_port: Number(newProject.target_port),
        healthcheck_path: "/",
        status: "running",
        created_at: new Date().toISOString(),
      };
      setProjects([localProj, ...projects]);
    }

    setIsModalOpen(false);
    setNewProject({ name: "", repo_fullname: "", branch: "main", target_port: 3000 });
  };

  const triggerDeploy = async (project: Project) => {
    setActiveLogProject(project.name);
    setLogModalOpen(true);
    setDeployLogs([`🚀 Menghubungi worker backend untuk deploy ${project.name}...`]);

    try {
      const res = await fetch(`/api/projects/${project.id}/deploy`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setDeployLogs((prev) => [...prev, `❌ Error: ${data.error || "Gagal memicu deployment"}`]);
        return;
      }

      const deploymentId = data.deployment_id;
      setDeployLogs((prev) => [
        ...prev,
        `✓ Deployment ID: ${deploymentId.slice(0, 8)} terdaftar di Queue.`,
        `[Log Stream] Menghubungkan WebSocket...`,
      ]);

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/logs/${deploymentId}`);

      ws.onmessage = (event) => {
        if (event.data) {
          const lines = event.data.split("\n");
          setDeployLogs((prev) => [...prev, ...lines.filter((l: string) => l.trim().length > 0)]);
        }
      };

      ws.onerror = () => {
        setDeployLogs((prev) => [...prev, `[WS] Log stream standby...`]);
      };
    } catch (err: unknown) {
      setDeployLogs((prev) => [...prev, `❌ Error koneksi: ${(err as Error).message}`]);
    }
  };

  const triggerRollback = async (project: Project) => {
    setActiveLogProject(project.name);
    setLogModalOpen(true);
    setDeployLogs([`🔄 Memicu rollback untuk ${project.name}...`]);

    try {
      const res = await fetch(`/api/projects/${project.id}/rollback`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setDeployLogs((prev) => [...prev, `❌ Error: ${data.error || "Gagal memicu rollback"}`]);
        return;
      }
      setDeployLogs((prev) => [
        ...prev,
        `✓ Rollback terdaftar (Deployment: ${data.deployment_id?.slice(0, 8)})`,
        `Target Image: ${data.target_image_hash || "cached version"}`,
      ]);
    } catch (err: unknown) {
      setDeployLogs((prev) => [...prev, `❌ Error: ${(err as Error).message}`]);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07090e]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Layers className="h-5 w-5 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                sPanel
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Single-Binary PaaS
              </span>
            </div>
            <p className="text-xs text-slate-400">Zero-Config AI-Powered Self-Hosted Cloud</p>
          </div>
        </div>

        {/* System Stats Ticker */}
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-400 bg-slate-900/60 border border-white/5 rounded-full px-5 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">SQLite WAL Active</span>
          </div>
          <div className="h-3 w-px bg-white/10"></div>
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span>{metrics.num_cpu} Cores</span>
          </div>
          <div className="h-3 w-px bg-white/10"></div>
          <div className="flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-purple-400" />
            <span>RAM: {metrics.alloc_mb} MB</span>
          </div>
          <div className="h-3 w-px bg-white/10"></div>
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span>Goroutines: {metrics.goroutines}</span>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:opacity-95 transition active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab("projects")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "projects"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="h-4 w-4" />
            Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "marketplace"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Database className="h-4 w-4" />
            Marketplace
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "ai"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Bot className="h-4 w-4" />
            AI DevOps Agent
          </button>
          <button
            onClick={() => setActiveTab("server")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "server"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Server className="h-4 w-4" />
            Janitor & Host
          </button>
        </div>

        {/* Tab 1: Projects */}
        {activeTab === "projects" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="glass-panel glass-card-hover rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/5 text-cyan-400">
                          <FolderGit2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white hover:text-cyan-400 transition cursor-pointer">
                            {proj.name}
                          </h3>
                          <p className="text-xs text-slate-400">{proj.repo_fullname}</p>
                        </div>
                      </div>

                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Healthy
                      </span>
                    </div>

                    {/* Magic Domain Pill */}
                    <div className="flex items-center justify-between text-xs bg-black/40 border border-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-500">Domain:</span>
                        <a
                          href={`http://${proj.magic_domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline font-mono truncate"
                        >
                          {proj.magic_domain}
                        </a>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" />
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-900/50 p-2 rounded-lg border border-white/5">
                        <p className="text-slate-500">Branch</p>
                        <p className="font-semibold text-slate-200">{proj.branch}</p>
                      </div>
                      <div className="bg-slate-900/50 p-2 rounded-lg border border-white/5">
                        <p className="text-slate-500">Port</p>
                        <p className="font-semibold text-cyan-400 font-mono">:{proj.target_port}</p>
                      </div>
                      <div className="bg-slate-900/50 p-2 rounded-lg border border-white/5">
                        <p className="text-slate-500">Routing</p>
                        <p className="font-semibold text-emerald-400">Traefik</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                    <button
                      onClick={() => triggerDeploy(proj)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/10 hover:text-cyan-400 border border-white/10 text-xs font-semibold transition"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Deploy Now
                    </button>
                    <button
                      onClick={() => triggerRollback(proj)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-purple-500/10 hover:text-purple-400 border border-white/10 text-xs font-semibold transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Rollback
                    </button>
                    <button
                      onClick={() => triggerDeploy(proj)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 transition"
                    >
                      <Terminal className="h-3.5 w-3.5" />
                      Logs
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Marketplace */}
        {activeTab === "marketplace" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">1-Click Service Templates</h2>
                <p className="text-sm text-slate-400">Instalasi database dengan auto-wire `DATABASE_URL` ke proyek target.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: "PostgreSQL 16", desc: "Production-ready relational database", port: 5432, color: "text-blue-400" },
                { name: "MySQL 8.0", desc: "Standard SQL database engine", port: 3306, color: "text-orange-400" },
                { name: "Redis 7.2", desc: "In-memory caching & fast key-value store", port: 6379, color: "text-red-400" },
              ].map((svc) => (
                <div key={svc.name} className="glass-panel glass-card-hover rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Database className={`h-8 w-8 ${svc.color}`} />
                    <span className="text-xs font-mono text-slate-400">Port {svc.port}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{svc.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{svc.desc}</p>
                  </div>
                  <div className="pt-2">
                    <button className="w-full py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition">
                      ⚡ 1-Click Launch & Attach
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: AI DevOps Agent */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 border-cyan-500/20 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Autonomous AI Sysadmin (BYOK)</h3>
                  <p className="text-xs text-slate-400">
                    Menganalisis kegagalan build, menyensor token/secret, dan memberikan PR/1-klik rekomendasi perbaikan.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-slate-400">Loop Breaker Guard</p>
                  <p className="text-lg font-bold text-emerald-400">Max 3 Retries (Active)</p>
                  <p className="text-[11px] text-slate-500 mt-1">Mencegah pemborosan token API saat error berulang.</p>
                </div>
                <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-slate-400">Remediation Mode</p>
                  <p className="text-lg font-bold text-purple-400">Supervised (Safe)</p>
                  <p className="text-[11px] text-slate-500 mt-1">Membutuhkan konfirmasi user sebelum menerapkan fix.</p>
                </div>
                <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-slate-400">Active AI Provider</p>
                  <p className="text-lg font-bold text-cyan-400">Google Gemini / OpenAI</p>
                  <p className="text-[11px] text-slate-500 mt-1">Kunci API tersimpan dengan enkripsi AES-256-GCM.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Server & Janitor */}
        {activeTab === "server" && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-lg">VPS Auto-Janitor & Hygiene</h3>
                    <p className="text-xs text-slate-400">Pembersih cache otomatis berjalan via Goroutine Cron internal.</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  Scheduled: 03:00 AM Daily
                </span>
              </div>

              <div className="bg-black/40 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2 border border-white/5">
                <p className="text-slate-500">{"// Janitor command executed automatically:"}</p>
                <p className="text-cyan-300">docker image prune -af --filter &quot;until=168h&quot;</p>
                <p className="text-emerald-400">✓ SQLite WAL Checkpointed safely (0 locked writes)</p>
                <p className="text-slate-400">✓ Log retention policy: Purge stderr archives &gt; 30 days</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Deploy Log Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl w-full max-w-3xl overflow-hidden border-cyan-500/30 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span className="font-bold text-sm text-white">Live Build Stream: {activeLogProject}</span>
              </div>
              <button
                onClick={() => setLogModalOpen(false)}
                className="text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition text-slate-300"
              >
                Close
              </button>
            </div>
            <div className="p-4 bg-[#05070a] font-mono text-xs text-slate-300 overflow-y-auto space-y-1.5 flex-1 min-h-[300px]">
              {deployLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-slate-600 select-none mr-3">{idx + 1}</span>
                  <span className={log.includes("✅") ? "text-emerald-400 font-bold" : log.includes("[Traefik]") ? "text-purple-400" : ""}>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Import Git Repository Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl w-full max-w-2xl overflow-hidden border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
            {selectedRepo ? (
              /* Configure & Deploy Screen */
              <div className="p-6 space-y-6 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setSelectedRepo(null)}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition"
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
                      setIsModalOpen(false);
                      setSelectedRepo(null);
                    }}
                    className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-white/5"
                  >
                    ✕
                  </button>
                </div>

                {/* Selected Repo Card */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
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

                <form onSubmit={handleDeployImportedProject} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Project Name (Slug)</label>
                    <input
                      type="text"
                      required
                      value={importConfig.name}
                      onChange={(e) => setImportConfig({ ...importConfig, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
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
                      <p className="font-mono text-cyan-400 mt-1 font-semibold">{importConfig.name}.{metrics.host_ip}.sslip.io</p>
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setSelectedRepo(null)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isDeployingImport}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
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
                  <button onClick={() => setShowManualInput(false)} className="text-xs text-cyan-400 hover:underline">
                    ← Back to GitHub Import
                  </button>
                </div>
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Project Name (Slug)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. my-awesome-app"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Repository Full Name (Owner/Repo)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. username/repo"
                      value={newProject.repo_fullname}
                      onChange={(e) => setNewProject({ ...newProject, repo_fullname: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Branch</label>
                      <input
                        type="text"
                        value={newProject.branch}
                        onChange={(e) => setNewProject({ ...newProject, branch: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Target Port</label>
                      <input
                        type="number"
                        value={newProject.target_port}
                        onChange={(e) => setNewProject({ ...newProject, target_port: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-semibold text-xs shadow-lg shadow-cyan-500/20"
                    >
                      Create &amp; Provision
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Vercel-style Import Git Repository view matching user screenshot! */
              <div className="flex flex-col h-full max-h-[85vh]">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold tracking-tight text-white">Import Git Repository</h2>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
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
                          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-sm font-medium hover:border-white/30 transition text-white"
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
                                fetchGitHubRepos();
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white flex items-center gap-2 transition"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Refresh Repositories
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAccountDropdownOpen(false);
                                handleDisconnectGitHub();
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 flex items-center gap-2 transition"
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

                      <form onSubmit={handleConnectGitHub} className="space-y-4">
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

                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 space-y-1.5">
                          <p className="font-semibold text-slate-300">💡 Cara cepat buat token GitHub:</p>
                          <p>Klik link di bawah untuk langsung membuka halaman token GitHub dengan izin <code>repo</code> yang sudah tercentang otomatis:</p>
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
                            className="text-xs text-slate-400 hover:text-white underline"
                          >
                            Atau input URL manual tanpa login
                          </button>
                          <button
                            type="submit"
                            disabled={isConnectingToken}
                            className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-slate-200 font-semibold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
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
                              className="flex items-center justify-between p-3.5 px-4 hover:bg-white/[0.03] transition group"
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
                                className="shrink-0 ml-4 px-4 py-1.5 rounded-lg bg-white text-black hover:bg-slate-200 font-semibold text-xs transition active:scale-95 shadow-sm"
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
                          className="hover:text-cyan-400 hover:underline"
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
      )}
    </div>
  );
}
