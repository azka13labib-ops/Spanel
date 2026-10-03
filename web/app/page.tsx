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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    os: "linux",
    arch: "amd64",
    num_cpu: 4,
    alloc_mb: 28,
    sys_mb: 64,
    goroutines: 12,
    host_ip: "127.0.0.1",
  });

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [activeLogProject, setActiveLogProject] = useState<string>("");
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [activeEnvProject, setActiveEnvProject] = useState<Project | null>(null);

  // GitHub state
  const [githubStatus, setGithubStatus] = useState<GitHubStatus | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    const [metricsData, projectsData, ghStatus] = await Promise.all([
      fetchSystemMetrics(),
      fetchProjects(),
      fetchGitHubStatus(),
    ]);

    if (metricsData) setMetrics(metricsData);
    if (projectsData && projectsData.length > 0) setProjects(projectsData);
    setGithubStatus(ghStatus);

    if (ghStatus.connected) {
      setLoadingRepos(true);
      const repos = await fetchGitHubRepos();
      setGithubRepos(repos);
      setLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadInitialData();
    };
    init();
  }, [loadInitialData]);

  const refreshRepos = async () => {
    setLoadingRepos(true);
    const repos = await fetchGitHubRepos();
    setGithubRepos(repos);
    setLoadingRepos(false);
  };

  // Deploy Action
  const handleDeploy = async (project: Project) => {
    setActiveLogProject(project.name);
    setLogModalOpen(true);
    setDeployLogs([`🚀 Menghubungi worker backend untuk deploy ${project.name}...`]);

    const res = await postDeploy(project.id);
    if (!res.ok) {
      setDeployLogs((prev) => [...prev, `❌ Error: ${res.error || "Gagal memicu deployment"}`]);
      return;
    }

    const deploymentId = res.deployment_id;
    if (deploymentId) {
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
    }
  };

  // Rollback Action
  const handleRollback = async (project: Project) => {
    setActiveLogProject(project.name);
    setLogModalOpen(true);
    setDeployLogs([`🔄 Memicu rollback untuk ${project.name}...`]);

    const res = await postRollback(project.id);
    if (!res.ok) {
      setDeployLogs((prev) => [...prev, `❌ Error: ${res.error || "Gagal memicu rollback"}`]);
      return;
    }

    setDeployLogs((prev) => [
      ...prev,
      `✓ Rollback terdaftar (Deployment: ${res.deployment_id?.slice(0, 8)})`,
      `Target Image: ${res.target_image_hash || "cached version"}`,
    ]);
  };

  const handleViewLogs = (project: Project) => {
    handleDeploy(project);
  };

  const handleProjectCreated = (newProject: Project, shouldDeploy = false) => {
    setProjects((prev) => [newProject, ...prev]);
    if (shouldDeploy) {
      handleDeploy(newProject);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col bg-[#05070a]">
      {/* Top Navbar */}
      <Navbar metrics={metrics} onOpenNewProject={() => setIsImportModalOpen(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
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
          />
        )}

        {activeTab === "marketplace" && <MarketplaceView projects={projects} />}

        {activeTab === "ai" && <AIAssistantView />}

        {activeTab === "server" && <ServerHygieneView />}
      </main>

      {/* Live Deploy Log Modal */}
      <DeployLogModal
        isOpen={logModalOpen}
        projectName={activeLogProject}
        logs={deployLogs}
        onClose={() => setLogModalOpen(false)}
      />

      {/* Environment Variables Modal */}
      <EnvVarsModal
        isOpen={!!activeEnvProject}
        project={activeEnvProject}
        onClose={() => setActiveEnvProject(null)}
        onTriggerDeploy={handleDeploy}
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
