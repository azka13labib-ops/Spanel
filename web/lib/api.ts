import {
  Project,
  SystemMetrics,
  GitHubStatus,
  GitHubRepo,
  GitHubBranch,
  InstalledService,
  DBCredentials,
  EnvVarItem,
} from "@/types";

export async function fetchSystemMetrics(): Promise<SystemMetrics | null> {
  try {
    const res = await fetch("/api/system/metrics");
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function fetchProjects(): Promise<Project[]> {
  try {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

export async function createProject(payload: {
  name: string;
  repo_fullname: string;
  branch: string;
  target_port: number;
  healthcheck_path?: string;
}): Promise<{ ok: boolean; data?: Project; error?: string }> {
  try {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      return { ok: true, data };
    }
    return { ok: false, error: data.error || "Gagal membuat project" };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Koneksi gagal" };
  }
}

export async function postDeploy(projectId: string): Promise<{ ok: boolean; deployment_id?: string; error?: string }> {
  try {
    const res = await fetch(`/api/projects/${projectId}/deploy`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      return { ok: true, deployment_id: data.deployment_id };
    }
    return { ok: false, error: data.error || "Gagal memicu deployment" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function postRollback(projectId: string): Promise<{
  ok: boolean;
  deployment_id?: string;
  target_image_hash?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/projects/${projectId}/rollback`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      return { ok: true, deployment_id: data.deployment_id, target_image_hash: data.target_image_hash };
    }
    return { ok: false, error: data.error || "Gagal memicu rollback" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function fetchGitHubStatus(): Promise<GitHubStatus> {
  try {
    const res = await fetch("/api/github/status");
    if (res.ok) return await res.json();
  } catch {}
  return { connected: false };
}

export async function fetchGitHubRepos(): Promise<GitHubRepo[]> {
  try {
    const res = await fetch("/api/github/repos");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

export async function fetchGitHubBranches(owner: string, repo: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/github/repos/${owner}/${repo}/branches`);
    if (res.ok) {
      const data: GitHubBranch[] = await res.json();
      if (Array.isArray(data)) {
        return data.map((b) => b.name);
      }
    }
  } catch {}
  return [];
}

export async function connectGitHub(token: string): Promise<{ ok: boolean; data?: GitHubStatus; error?: string }> {
  try {
    const res = await fetch("/api/github/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      return { ok: true, data: { connected: true, username: data.username, avatar_url: data.avatar_url } };
    }
    return { ok: false, error: data.error || "Gagal menghubungkan GitHub" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function disconnectGitHub(): Promise<boolean> {
  try {
    const res = await fetch("/api/github/disconnect", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchMarketplaceServices(): Promise<InstalledService[]> {
  try {
    const res = await fetch("/api/marketplace");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

export async function installMarketplaceService(
  serviceName: string
): Promise<{ ok: boolean; data?: { service: InstalledService; credentials?: DBCredentials }; error?: string }> {
  try {
    const res = await fetch("/api/marketplace/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_name: serviceName }),
    });
    const data = await res.json();
    if (res.ok) {
      return { ok: true, data };
    }
    return { ok: false, error: data.error || "Gagal memasang database" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function attachDatabaseToProject(
  projectId: string,
  marketplaceServiceId: string
): Promise<{ ok: boolean; data?: { message: string; injected_uri: string }; error?: string }> {
  try {
    const res = await fetch(`/api/projects/${projectId}/attach-db`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketplace_service_id: marketplaceServiceId }),
    });
    const data = await res.json();
    if (res.ok) {
      return { ok: true, data };
    }
    return { ok: false, error: data.error || "Gagal menghubungkan database ke project" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteMarketplaceService(
  serviceId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/marketplace/${serviceId}`, {
      method: "DELETE",
    });
    if (res.ok) return { ok: true };
    const data = await res.json();
    return { ok: false, error: data.error };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function fetchProjectEnvVars(projectId: string): Promise<EnvVarItem[]> {
  try {
    const res = await fetch(`/api/projects/${projectId}/env`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

export async function setProjectEnvVar(
  projectId: string,
  key: string,
  value: string
): Promise<{ ok: boolean; data?: EnvVarItem; error?: string }> {
  try {
    const res = await fetch(`/api/projects/${projectId}/env`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    const data = await res.json();
    if (res.ok) return { ok: true, data };
    return { ok: false, error: data.error || "Gagal menyimpan environment variable" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function bulkSetProjectEnvVars(
  projectId: string,
  rawEnv: string
): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const res = await fetch(`/api/projects/${projectId}/env/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_env: rawEnv }),
    });
    const data = await res.json();
    if (res.ok) return { ok: true, count: data.count };
    return { ok: false, error: data.error || "Gagal menyimpan bulk environment variables" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteProjectEnvVar(
  projectId: string,
  envId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/projects/${projectId}/env/${envId}`, {
      method: "DELETE",
    });
    if (res.ok) return { ok: true };
    const data = await res.json();
    return { ok: false, error: data.error };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
