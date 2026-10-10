export interface DeploymentItem {
  id: string;
  project_id: string;
  project_name?: string;
  status: string; // "queued" | "building" | "healthy" | "success" | "failed" | "rolled_back"
  commit_hash?: string;
  commit_message?: string;
  image_hash?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  duration_ms?: number;
}

export interface ContainerItem {
  id: string;
  name: string;
  project_id?: string;
  image: string;
  status: "running" | "exited" | "paused" | "restarting" | "dead";
  created_at?: string;
  port: number;
  cpu_percent?: number;
  memory_mb?: number;
  uptime?: string;
  is_database?: boolean;
}

export interface Project {
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
  deployments?: DeploymentItem[];
  env_vars?: EnvVarItem[];
}

export interface SystemMetrics {
  os: string;
  arch: string;
  num_cpu: number;
  alloc_mb: number;
  total_mb?: number;
  sys_mb: number;
  goroutines: number;
  host_ip: string;
  host_total_ram_mb?: number;
  host_used_ram_mb?: number;
  host_free_ram_mb?: number;
  host_ram_percent?: number;
  host_cpu_percent?: number;
  load_avg_1?: number;
}

export interface GitHubOwner {
  login: string;
  avatar_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string;
  default_branch: string;
  language: string;
  updated_at: string;
  owner: GitHubOwner;
}

export interface GitHubStatus {
  connected: boolean;
  username?: string;
  avatar_url?: string;
}

export interface GitHubBranch {
  name: string;
  protected?: boolean;
}

export interface EnvVarItem {
  id: string;
  key: string;
  value: string;
  is_system_injected: boolean;
}

export interface DBCredentials {
  service_name: string;
  username: string;
  password: string;
  database_name: string;
  port: number;
  host: string;
  internal_uri: string;
  external_uri: string;
}

export interface InstalledService {
  id: string;
  service_name: string;
  container_id: string;
  internal_hostname: string;
  internal_port: number;
  volume_host_path?: string;
  status: string;
  created_at: string;
  credentials?: DBCredentials;
}

export interface MarketplaceTemplate {
  id: "postgresql" | "mysql" | "redis" | "sqlite";
  name: string;
  desc: string;
  port: number;
  color: string;
  category: "SQL" | "Cache" | "Embedded";
}

export interface BackupInfo {
  filename: string;
  size: number;
  created_at: string;
  service: string;
}

export type DashboardTab =
  | "dashboard"
  | "applications"
  | "terminal"
  | "deployments"
  | "containers"
  | "github"
  | "monitoring"
  | "logs"
  | "settings"
  | "projects"
  | "marketplace"
  | "dns"
  | "ai"
  | "server";

export interface AIConfig {
  is_configured: boolean;
  provider_name?: "gemini" | "openai" | "";
  masked_key?: string;
}

export interface AIRemediation {
  id: string;
  deployment_id: string;
  error_category: string;
  ai_analysis: string;
  is_applied: boolean;
  created_at?: string;
}

export interface DNSConfig {
  is_configured: boolean;
  masked_token?: string;
}

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  name_servers?: string[];
}

export interface DNSRecordItem {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  proxiable?: boolean;
  proxied?: boolean;
  ttl: number;
  comment?: string;
  priority?: number;
  created_on?: string;
  modified_on?: string;
}

export interface CreateDNSRecordInput {
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  comment: string;
  priority?: number;
}

export interface VersionInfo {
  current_version: string;
  latest_version: string;
  has_update: boolean;
  release_name?: string;
  release_notes?: string;
  release_url?: string;
  published_at?: string;
  checked_at?: string;
}

