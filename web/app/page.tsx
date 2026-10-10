"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Project, SystemMetrics, DashboardTab, GitHubRepo, GitHubStatus, VersionInfo } from "@/types";
import {
  fetchProjects,
  fetchSystemMetrics,
  fetchGitHubStatus,
  fetchGitHubRepos,
  fetchVersionInfo,
  postDeploy,
  postRollback,
  projectAction,
  authEvent,
  getWebSocketUrl,
  logout,
} from "@/lib/api";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardOverviewView } from "@/components/views/DashboardOverviewView";
import { ApplicationsView } from "@/components/views/ApplicationsView";
import { DeploymentsView } from "@/components/views/DeploymentsView";
import { ContainersView } from "@/components/views/ContainersView";
import { GitHubView } from "@/components/views/GitHubView";
import { MonitoringView } from "@/components/views/MonitoringView";
import { LogsView } from "@/components/views/LogsView";
import { TerminalView } from "@/components/views/TerminalView";
import { SettingsView } from "@/components/views/SettingsView";

import { DeployLogModal } from "@/components/modals/DeployLogModal";
import { ImportProjectModal } from "@/components/modals/ImportProjectModal";
import { EnvVarsModal } from "@/components/modals/EnvVarsModal";
import { WebTerminalModal } from "@/components/modals/WebTerminalModal";
import { ProjectSettingsModal } from "@/components/modals/ProjectSettingsModal";
import { UpdateModal } from "@/components/modals/UpdateModal";
import { LoginScreen } from "@/components/layout/LoginScreen";

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    os: "linux",
    arch: "amd64",
    num_cpu: 4,
    alloc_mb: 24,
    sys_mb: 48,
    goroutines: 12,
    host_ip: "100.125.7.123",
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

  // Version & Updates state
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);

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

      fetchVersionInfo().then((ver) => {
        if (ver) setVersionInfo(ver);
      });
    } catch {
      // API error or unauthorized
    }
  }, [refreshRepos]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInitialData();
    }, 0);

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };

    authEvent?.addEventListener("unauthorized", handleUnauthorized);

    const interval = setInterval(() => {
      fetchSystemMetrics().then((mets) => {
        if (mets) setMetrics(mets);
      });
    }, 5000);

    return () => {
      clearTimeout(timer);
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
    setDeployLogs([`[BUILD] Contacting backend orchestrator to deploy ${project.name}...`]);

    const res = await postDeploy(project.id);
    if (!res.ok) {
      setDeployLogs((prev) => [...prev, `[ERROR] Failed to trigger deploy: ${res.error || "Unknown error"}`]);
      showToast(`Deploy failed for ${project.name}`);
      return;
    }

    showToast(`Deployment started for ${project.name}`);

    const deploymentId = res.deployment_id;
    if (deploymentId) {
      setDeployLogs((prev) => [
        ...prev,
        `[SUCCESS] Deployment ID ${deploymentId.slice(0, 8)} queued.`,
        `[WS] Connecting WebSocket log stream...`,
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
    setDeployLogs([`[ROLLBACK] Triggering rollback for ${project.name}...`]);

    const res = await postRollback(project.id);
    if (!res.ok) {
      setDeployLogs((prev) => [...prev, `[ERROR] Rollback failed: ${res.error}`]);
      showToast(`Rollback failed: ${res.error}`);
      return;
    }

    showToast(`Rollback triggered for ${project.name}`);
    setDeployLogs((prev) => [
      ...prev,
      `[SUCCESS] Rollback queued (Deployment: ${res.deployment_id?.slice(0, 8)})`,
      `[INFO] Target image: ${res.target_image_hash || "cached version"}`,
    ]);
  };

  const handleContainerAction = async (project: Project, action: "start" | "stop" | "restart") => {
    const res = await projectAction(project.id, action);
    if (!res.ok) {
      showToast(`Failed to ${action} container: ${res.error}`);
    } else {
      showToast(`Container ${action}ed successfully`);
      loadInitialData();
    }
  };

  const handleViewLogs = (project: Project) => {
    setActiveLogProject(project.name);
    setActiveLogProjectObj(project);
    setLogModalType("runtime");
    setLogModalOpen(true);
    setDeployLogs([`[RUNTIME] Connecting to live stdout logs for ${project.name}...`]);

    const wsUrl = getWebSocketUrl(`/ws/runtime-logs/${project.id}`);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      if (event.data) {
        const lines = event.data.split("\n");
        setDeployLogs((prev) => {
          const newLogs = [...prev, ...lines.filter((l: string) => l.trim().length > 0)];
          if (newLogs.length > 400) return newLogs.slice(newLogs.length - 400);
          return newLogs;
        });
      }
    };

    ws.onerror = () => {
      setDeployLogs((prev) => [...prev, `[WS] Runtime log standby (container idle).`]);
    };
  };

  const handleProjectCreated = (newProject: Project, shouldDeploy = false) => {
    setProjects((prev) => [newProject, ...prev]);
    showToast(`Project ${newProject.name} created successfully!`);
    if (shouldDeploy) {
      handleDeploy(newProject);
    }
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={() => {
          setIsAuthenticated(true);
          loadInitialData();
        }}
      />
    );
  }

  const containerCount = projects.filter((p) => p.status === "running").length;

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#111827] flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150 border border-gray-800">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Application Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSearchQuery("");
        }}
        projectCount={projects.length}
        containerCount={containerCount}
        metrics={metrics}
        githubStatus={githubStatus}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        versionInfo={versionInfo}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <Topbar
          metrics={metrics}
          projects={projects}
          onNavigate={(tab) => setActiveTab(tab)}
          onContainerAction={handleContainerAction}
          onViewLogs={handleViewLogs}
          onOpenNewProject={() => setIsImportModalOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          versionInfo={versionInfo}
          onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
          onLogout={() => {
            logout().finally(() => {
              setIsAuthenticated(false);
            });
          }}
        />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-7 max-w-7xl w-full mx-auto">
          {activeTab === "dashboard" && (
            <DashboardOverviewView
              projects={projects}
              metrics={metrics}
              onNavigate={(tab) => setActiveTab(tab)}
              onDeploy={handleDeploy}
              onViewLogs={handleViewLogs}
              onOpenTerminal={(proj) => setTerminalProject(proj)}
              onOpenSettings={(proj) => setActiveSettingsProject(proj)}
              onOpenNewProject={() => setIsImportModalOpen(true)}
            />
          )}

          {(activeTab === "applications" || activeTab === "projects") && (
            <ApplicationsView
              projects={projects}
              searchQuery={searchQuery}
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

          {activeTab === "deployments" && (
            <DeploymentsView
              projects={projects}
              onDeploy={handleDeploy}
              onViewLogs={handleViewLogs}
              onRollback={handleRollback}
            />
          )}

          {activeTab === "containers" && (
            <ContainersView
              projects={projects}
              onContainerAction={handleContainerAction}
              onOpenTerminal={(proj) => setTerminalProject(proj)}
              onViewLogs={handleViewLogs}
            />
          )}

          {activeTab === "github" && (
            <GitHubView
              githubStatus={githubStatus}
              repos={githubRepos}
              loadingRepos={loadingRepos}
              onRefreshRepos={refreshRepos}
              onDeployRepo={() => setIsImportModalOpen(true)}
              onStatusChange={(st) => setGithubStatus(st)}
            />
          )}

          {activeTab === "terminal" && (
            <TerminalView
              projects={projects}
              onContainerAction={handleContainerAction}
            />
          )}

          {activeTab === "monitoring" && <MonitoringView metrics={metrics} />}

          {activeTab === "logs" && (
            <LogsView
              projects={projects}
              onOpenTerminal={(proj) => setTerminalProject(proj)}
            />
          )}

          {(activeTab === "settings" ||
            activeTab === "marketplace" ||
            activeTab === "dns" ||
            activeTab === "ai" ||
            activeTab === "server") && (
            <SettingsView
              metrics={metrics}
              projects={projects}
              onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
            />
          )}
        </main>
      </div>

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
        hostIp={metrics.host_ip}
        onClose={() => setActiveSettingsProject(null)}
        onSuccess={() => {
          setActiveSettingsProject(null);
          loadInitialData();
          showToast("Settings updated successfully");
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
        title={`Terminal: ${terminalProject?.name || ""}`}
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

      {/* System Update Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        versionInfo={versionInfo}
        onVersionUpdated={(info) => {
          setVersionInfo(info);
          if (info.has_update) {
            showToast(`Versi baru sPanel tersedia: ${info.latest_version}`);
          }
        }}
      />
    </div>
  );
}
