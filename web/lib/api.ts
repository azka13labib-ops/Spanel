import {
  Project,
  SystemMetrics,
  GitHubStatus,
  GitHubRepo,
  GitHubBranch,
  InstalledService,
  DBCredentials,
  EnvVarItem,
  BackupInfo,
  AIConfig,
  DNSConfig,
  CloudflareZone,
  DNSRecordItem,
  CreateDNSRecordInput,
  VersionInfo,
} from "@/types";

export const authEvent = typeof window !== 'undefined' ? new EventTarget() : null;

export function getWebSocketUrl(path: string): string {
  if (typeof window === "undefined") return "";
  const isDev = window.location.port === "3000";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = isDev ? `${window.location.hostname}:8080` : window.location.host;
  const token = localStorage.getItem("spanel_token") || "";
  const delimiter = path.includes("?") ? "&" : "?";
  return `${protocol}//${host}${path}${token ? `${delimiter}token=${encodeURIComponent(token)}` : ""}`;
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("spanel_token") || "" : "";
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const config = { ...init, headers };

  const res = await fetch(input, config);

  if ((res.status === 401 || res.status === 503) && typeof window !== "undefined") {
    // Notify the UI to show the Login Screen (or Setup Screen for 503)
    authEvent?.dispatchEvent(new Event("unauthorized"));
  }
  return res;
}

export async function fetchSystemMetrics(): Promise<SystemMetrics | null> {
  try {
    const res = await apiFetch("/api/system/metrics");
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function fetchProjects(): Promise<Project[]> {
  try {
    const res = await apiFetch("/api/projects");
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
    const res = await apiFetch("/api/projects", {
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
    const res = await apiFetch(`/api/projects/${projectId}/deploy`, { method: "POST" });
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
    const res = await apiFetch(`/api/projects/${projectId}/rollback`, { method: "POST" });
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
    const res = await apiFetch("/api/github/status");
    if (res.ok) return await res.json();
  } catch {}
  return { connected: false };
}

export async function fetchGitHubRepos(): Promise<GitHubRepo[]> {
  try {
    const res = await apiFetch("/api/github/repos");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

export async function fetchGitHubBranches(owner: string, repo: string): Promise<string[]> {
  try {
    const res = await apiFetch(`/api/github/repos/${owner}/${repo}/branches`);
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
    const res = await apiFetch("/api/github/connect", {
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
    const res = await apiFetch("/api/github/disconnect", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchMarketplaceServices(): Promise<InstalledService[]> {
  try {
    const res = await apiFetch("/api/marketplace");
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
    const res = await apiFetch("/api/marketplace/install", {
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
    const res = await apiFetch(`/api/projects/${projectId}/attach-db`, {
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
    const res = await apiFetch(`/api/marketplace/${serviceId}`, {
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
    const res = await apiFetch(`/api/projects/${projectId}/env`);
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
    const res = await apiFetch(`/api/projects/${projectId}/env`, {
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
    const res = await apiFetch(`/api/projects/${projectId}/env/bulk`, {
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
    const res = await apiFetch(`/api/projects/${projectId}/env/${envId}`, {
      method: "DELETE",
    });
    if (res.ok) return { ok: true };
    const data = await res.json();
    return { ok: false, error: data.error };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function triggerMarketplaceBackup(
  serviceId: string
): Promise<{ ok: boolean; data?: BackupInfo; error?: string }> {
  try {
    const res = await apiFetch(`/api/marketplace/${serviceId}/backup`, { method: "POST" });
    const data = await res.json();
    if (res.ok) return { ok: true, data: data.backup };
    return { ok: false, error: data.error || "Gagal membuat backup" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function fetchMarketplaceBackups(serviceId: string): Promise<BackupInfo[]> {
  try {
    const res = await apiFetch(`/api/marketplace/${serviceId}/backups`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

export async function restoreMarketplaceBackup(
  serviceId: string,
  filename: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(`/api/marketplace/${serviceId}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    const data = await res.json();
    if (res.ok) return { ok: true };
    return { ok: false, error: data.error || "Gagal restore database" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteProject(projectId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) return { ok: true };
    const data = await res.json();
    return { ok: false, error: data.error || "Failed to delete project" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateProject(projectId: string, payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return { ok: true };
    const data = await res.json();
    return { ok: false, error: data.error || "Failed to update project" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function projectAction(projectId: string, action: 'start'|'stop'|'restart'): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(`/api/projects/${projectId}/${action}`, { method: "POST" });
    if (res.ok) return { ok: true };
    const data = await res.json();
    return { ok: false, error: data.error || `Failed to ${action} project` };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateProjectDomain(projectId: string, domain: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(`/api/projects/${projectId}/domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json();
    return { ok: false, error: data.error || "Failed to update custom domain" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function fetchAIConfig(): Promise<AIConfig | null> {
  try {
    const res = await apiFetch("/api/ai/config");
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function saveAIConfig(payload: {
  provider_name: string;
  api_key: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await apiFetch("/api/ai/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return { ok: true, message: data.message };
    return { ok: false, error: data.error || "Gagal menyimpan konfigurasi AI" };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Koneksi gagal" };
  }
}

export async function deleteAIConfig(): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await apiFetch("/api/ai/config", { method: "DELETE" });
    const data = await res.json();
    if (res.ok) return { ok: true, message: data.message };
    return { ok: false, error: data.error || "Gagal menghapus konfigurasi AI" };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Koneksi gagal" };
  }
}

export async function testAIConfig(payload: {
  provider_name?: string;
  api_key?: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await apiFetch("/api/ai/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return { ok: true, message: data.message };
    return { ok: false, error: data.error || "Gagal menguji koneksi AI" };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Koneksi gagal" };
  }
}

export async function fetchDNSConfig(): Promise<DNSConfig | null> {
  try {
    const res = await apiFetch("/api/dns/config");
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function saveDNSConfig(apiToken: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await apiFetch("/api/dns/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_token: apiToken }),
    });
    const data = await res.json();
    if (res.ok) return { ok: true, message: data.message };
    return { ok: false, error: data.error || "Gagal menyimpan token Cloudflare" };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Koneksi gagal" };
  }
}

export async function deleteDNSConfig(): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await apiFetch("/api/dns/config", { method: "DELETE" });
    const data = await res.json();
    if (res.ok) return { ok: true, message: data.message };
    return { ok: false, error: data.error || "Gagal menghapus token Cloudflare" };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Koneksi gagal" };
  }
}

export async function fetchDNSZones(): Promise<CloudflareZone[]> {
  try {
    const res = await apiFetch("/api/dns/zones");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

export async function fetchDNSRecords(zoneId: string): Promise<DNSRecordItem[]> {
  try {
    const res = await apiFetch(`/api/dns/zones/${zoneId}/records`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

export async function createDNSRecord(
  zoneId: string,
  payload: CreateDNSRecordInput
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await apiFetch(`/api/dns/zones/${zoneId}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return { ok: true, message: data.message };
    return { ok: false, error: data.error || "Gagal menambahkan record DNS" };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Koneksi gagal" };
  }
}

export async function deleteDNSRecord(
  zoneId: string,
  recordId: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await apiFetch(`/api/dns/zones/${zoneId}/records/${recordId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (res.ok) return { ok: true, message: data.message };
    return { ok: false, error: data.error || "Gagal menghapus record DNS" };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Koneksi gagal" };
  }
}

export async function quickPointDNSRecord(
  zoneId: string,
  payload: { subdomain: string; proxied: boolean; comment?: string }
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await apiFetch(`/api/dns/zones/${zoneId}/quick-point`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) return { ok: true, message: data.message };
    return { ok: false, error: data.error || "Gagal mengarahkan domain" };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Koneksi gagal" };
  }
}

export async function verifyProjectDomain(projectId: string, domain?: string): Promise<{
  configured: boolean;
  domain?: string;
  server_ip?: string;
  resolved_ips?: string[];
  points_to_server?: boolean;
  status?: "connected" | "pending" | "misconfigured";
  message?: string;
}> {
  try {
    const q = domain ? `?domain=${encodeURIComponent(domain.trim())}` : "";
    const res = await apiFetch(`/api/projects/${projectId}/domain-verify${q}`);
    if (res.ok) return await res.json();
  } catch {}
  return { configured: false, status: "pending" };
}

export async function fetchVersionInfo(): Promise<VersionInfo | null> {
  try {
    const res = await apiFetch("/api/system/version");
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

export async function checkForUpdates(): Promise<VersionInfo | null> {
  try {
    const res = await apiFetch("/api/system/check-update", { method: "POST" });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

export async function triggerSelfUpdate(): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await apiFetch("/api/system/self-update", { method: "POST" });
    const data = await res.json();
    if (res.ok) return { ok: true, message: data.message };
    return { ok: false, error: data.error || "Gagal melakukan pembaruan otomatis" };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Koneksi terputus saat proses pembaruan" };
  }
}
