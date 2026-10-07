"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Project, SystemMetrics, DashboardTab, GitHubRepo, GitHubStatus } from "@/types";
import {
  fetchProjects,
  fetchSystemMetrics,
  fetchGitHubStatus,
  fetchGitHubRepos,
  postDeploy,
  postRollback,
  projectAction,
  authEvent,
  getWebSocketUrl,
} from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { NavTabs } from "@/components/layout/NavTabs";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { MarketplaceView } from "@/components/marketplace/MarketplaceView";
import { AIAssistantView } from "@/components/ai/AIAssistantView";
import { ServerHygieneView } from "@/components/server/ServerHygieneView";
import { DeployLogModal } from "@/components/modals/DeployLogModal";
import { ImportProjectModal } from "@/components/modals/ImportProjectModal";
import { EnvVarsModal } from "@/components/modals/EnvVarsModal";
import { WebTerminalModal } from "@/components/modals/WebTerminalModal";
import { ProjectSettingsModal } from "@/components/modals/ProjectSettingsModal";
import { LoginScreen } from "@/components/layout/LoginScreen";

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    os: "linux",
    arch: "amd64",
    num_cpu: 4,
    alloc_mb: 24,
    sys_mb: 48,
    goroutines: 12,
    host_ip: "127.0.0.1",
  });

  // Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [activeSettingsProject, setActiveSettingsProject] = useState<Project | null>(null);
  const [activeEnvProject, setActiveEnvProject] = useState<Project | null>(null);
  const [terminalProject, setTerminalProject] = useState<Project | null>(null);

  // Deploy Logs Stream Modal State
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [activeLogProject, setActiveLogProject] = useState("");
  const [activeLogProjectObj, setActiveLogProjectObj] = useState<Project | null>(null);
  const [logModalType, setLogModalType] = useState<"build" | "runtime">("build");
  const [deployLogs, setDeployLogs] = useState<string[]>([]);

  // GitHub integration
  const [githubStatus, setGithubStatus] = useState<GitHubStatus | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refreshRepos = useCallback(async () => {
    setLoadingRepos(true);
    const repos = await fetchGitHubRepos();
    if (repos) setGithubRepos(repos);
    setLoadingRepos(false);
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const [projs, mets, ghStat] = await Promise.all([
        fetchProjects(),
        fetchSystemMetrics(),
        fetchGitHubStatus(),
      ]);

      if (projs) setProjects(projs);
      if (mets) setMetrics(mets);
      if (ghStat) setGithubStatus(ghStat);

      if (ghStat && ghStat.connected) {
        refreshRepos();
      }
    } catch {
      // API error or unauthorized
    }
  }, [refreshRepos]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      loadInitialData();
    }

    // Listen to unauthorized event from apiFetch
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };

    authEvent?.addEventListener("unauthorized", handleUnauthorized);

    const interval = setInterval(() => {
      fetchSystemMetrics().then((mets) => {
        if (mets && mounted) setMetrics(mets);
      });
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
      authEvent?.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, [loadInitialData]);

  // Deploy Action
  const handleDeploy = async (project: Project) => {
    setActiveLogProject(project.name);
    setActiveLogProjectObj(project);
    setLogModalType("build");
    setLogModalOpen(true);
    setDeployLogs([`🚀 Menghubungi worker backend untuk deploy ${project.name}...`]);

    const res = await postDeploy(project.id);
    if (!res.ok) {
      setDeployLogs((prev) => [...prev, `❌ Error: ${res.error || "Gagal memicu deployment"}`]);
      showToast(`❌ Deploy failed for ${project.name}`);
      return;
    }

    showToast(`🚀 Deployment started for ${project.name}`);

    const deploymentId = res.deployment_id;
    if (deploymentId) {
      setDeployLogs((prev) => [
        ...prev,
        `✓ Deployment ID: ${deploymentId.slice(0, 8)} terdaftar di Queue.`,
        `[Log Stream] Menghubungkan WebSocket...`,
      ]);

      const wsUrl = getWebSocketUrl(`/ws/logs/${deploymentId}`);
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        if (event.data) {
          const lines = event.data.split("\n");
          setDeployLogs((prev) => [...prev, ...lines.filter((l: string) => l.trim().length > 0)]);
        }
      };

      ws.onerror = () => {
        setDeployLogs((prev) => [...prev, `[WS] Log stream standby...`]);
      };
    }
  };

  // Rollback Action
  const handleRollback = async (project: Project) => {
    setActiveLogProject(project.name);
    setActiveLogProjectObj(project);
    setLogModalType("build");
    setLogModalOpen(true);
    setDeployLogs([`🔄 Memicu rollback untuk ${project.name}...`]);

    const res = await postRollback(project.id);
    if (!res.ok) {
      setDeployLogs((prev) => [...prev, `❌ Error: ${res.error || "Gagal memicu rollback"}`]);
      showToast(`❌ Rollback failed: ${res.error}`);
      return;
    }

    showToast(`✓ Rollback triggered for ${project.name}`);

    setDeployLogs((prev) => [
      ...prev,
      `✓ Rollback terdaftar (Deployment: ${res.deployment_id?.slice(0, 8)})`,
      `Target Image: ${res.target_image_hash || "cached version"}`,
    ]);
  };

  const handleContainerAction = async (project: Project, action: 'start'|'stop'|'restart') => {
    const res = await projectAction(project.id, action);
    if (!res.ok) {
      showToast(`❌ Failed to ${action} container: ${res.error}`);
    } else {
      showToast(`✓ Container ${action}ed successfully`);
      loadInitialData();
    }
  };

  const handleViewLogs = (project: Project) => {
    setActiveLogProject(project.name);
    setActiveLogProjectObj(project);
    setLogModalType("runtime");
    setLogModalOpen(true);
    setDeployLogs([`[Logs] Connecting to runtime logs for ${project.name}...`]);

    const wsUrl = getWebSocketUrl(`/ws/runtime-logs/${project.id}`);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      if (event.data) {
        const lines = event.data.split("\n");
        setDeployLogs((prev) => {
          const newLogs = [...prev, ...lines.filter((l: string) => l.trim().length > 0)];
          if (newLogs.length > 300) return newLogs.slice(newLogs.length - 300);
          return newLogs;
        });
      }
    };
    
    ws.onerror = () => {
      setDeployLogs((prev) => [...prev, `[WS] Runtime log error or standby...`]);
    };
  };

  const handleProjectCreated = (newProject: Project, shouldDeploy = false) => {
    setProjects((prev) => [newProject, ...prev]);
    showToast(`🎉 Project ${newProject.name} created!`);
    if (shouldDeploy) {
      handleDeploy(newProject);
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => {
      setIsAuthenticated(true);
      loadInitialData();
    }} />;
  }

  return (
    <div className="min-h-screen text-gray-900 bg-gray-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150 border border-gray-800">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        metrics={metrics}
        githubStatus={githubStatus}
        onOpenNewProject={() => setIsImportModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-5 sm:p-7 space-y-6">
        {/* Navigation Tabs */}
        <NavTabs activeTab={activeTab} onTabChange={setActiveTab} projectCount={projects.length} />

        {/* Tab Views */}
        {activeTab === "projects" && (
          <ProjectGrid
            projects={projects}
            onDeploy={handleDeploy}
            onRollback={handleRollback}
            onViewLogs={handleViewLogs}
            onOpenEnvVars={(proj) => setActiveEnvProject(proj)}
            onOpenTerminal={(proj) => setTerminalProject(proj)}
            onOpenSettings={(proj) => setActiveSettingsProject(proj)}
            onContainerAction={handleContainerAction}
            onOpenNewProject={() => setIsImportModalOpen(true)}
          />
        )}

        {activeTab === "marketplace" && <MarketplaceView projects={projects} />}

        {activeTab === "ai" && <AIAssistantView />}

        {activeTab === "server" && <ServerHygieneView />}
      </main>

      {/* Live Deploy Log Modal */}
      <DeployLogModal
        isOpen={logModalOpen}
        projectName={`${activeLogProject} (${logModalType} logs)`}
        logs={deployLogs}
        onClose={() => setLogModalOpen(false)}
        magicDomain={activeLogProjectObj?.magic_domain}
        customDomain={activeLogProjectObj?.custom_domain}
      />

      {/* Project Settings Modal */}
      <ProjectSettingsModal
        isOpen={!!activeSettingsProject}
        project={activeSettingsProject}
        onClose={() => setActiveSettingsProject(null)}
        onSuccess={() => {
          setActiveSettingsProject(null);
          loadInitialData();
          showToast("✓ Settings updated successfully");
        }}
      />

      {/* Environment Variables Modal */}
      <EnvVarsModal
        isOpen={!!activeEnvProject}
        project={activeEnvProject}
        onClose={() => setActiveEnvProject(null)}
        onTriggerDeploy={handleDeploy}
      />

      {/* Web Terminal Modal */}
      <WebTerminalModal
        isOpen={!!terminalProject}
        onClose={() => setTerminalProject(null)}
        title={`Terminal — ${terminalProject?.name || ""}`}
        containerId={`spanel-app-${terminalProject?.name || ""}`}
      />

      {/* Import / Create Project Modal */}
      <ImportProjectModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        hostIP={metrics.host_ip}
        onProjectCreated={handleProjectCreated}
        githubStatus={githubStatus}
        onGitHubStatusChange={setGithubStatus}
        githubRepos={githubRepos}
        loadingRepos={loadingRepos}
        onRefreshRepos={refreshRepos}
      />
    </div>
  );
}
