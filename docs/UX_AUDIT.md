# Human-Centered UI/UX Audit Report — sPanel (Smart PaaS Panel)

**Product:** sPanel (Smart PaaS Panel)  
**Version:** v1.1.0  
**Audit Date:** 2026-10-10  
**Auditor Roles:** Senior UX Auditor, Human-Centered Product Designer, Accessibility Specialist, Senior Frontend Engineer  
**Frameworks & Standards:** Next.js App Router, Tailwind CSS, WCAG 2.1 AA, Anti-AI-Slop & Human-Centered Design  

---

## 1. Executive Summary

sPanel is a self-hosted Platform as a Service (PaaS) built with a Go backend and a Next.js/Tailwind frontend. While sPanel presents an attractive modern interface inspired by platforms like Railway and Vercel, a rigorous human-centered audit revealed several critical interaction, safety, and telemetry issues:

1. **Operational Safety Risks (P1):** High-consequence production operations (container termination, service restart, deployment rollback, GitHub disconnection) executed immediately upon clicking small icon buttons with **zero confirmation dialogs or explanations of consequences**.
2. **Fabricated & Hardcoded Metrics (P1):** Multiple screens presented fabricated numbers instead of real telemetry: hardcoded `2.1%` CPU and `128 MB` RAM in container tables, `{runningCount || 1}` falsifying 0 running containers to 1 on the dashboard, static `100%` uptime SLA, hardcoded `"24s"` deployment duration, and hardcoded `"2d 4h"` application uptime.
3. **Disruptive Interaction Modals (P2):** Forms frequently used native browser `alert()` and `confirm()` dialogs, blocking browser threads and breaking accessibility and design consistency.
4. **Onboarding & Guidance Barriers (P2):** GitHub integration required a Personal Access Token without communicating required scopes (`repo`, `read:user`) or providing a direct token creation link.
5. **Localization & Language Disparity (P2):** Critical status messages, anomaly alerts, and modal dialogs alternated unpredictably between Indonesian and English.
6. **Accessibility & Contrast Deficits (P3):** Several small metadata labels used `text-gray-400` on white (contrast ratio 2.85:1, failing WCAG AA), and icon-only buttons lacked `aria-label`, visible focus rings, and touch-target padding.

This audit details each finding with verifiable code references, user impact analysis, and implementation fixes.

---

## 2. Scope & Inspected Components

The audit covered all primary user flows, views, modals, and navigation routes in `web/`:

- **Navigation & Layout:** `web/components/layout/Sidebar.tsx`, `web/components/layout/Topbar.tsx`
- **Dashboard & Telemetry:** `web/components/views/DashboardOverviewView.tsx`, `web/components/views/MonitoringView.tsx`
- **Application & Lifecycle Management:** `web/components/views/ApplicationsView.tsx`, `web/components/views/ApplicationDetailView.tsx`
- **Workload & Container Controls:** `web/components/views/ContainersView.tsx`
- **Build Pipelines & Releases:** `web/components/views/DeploymentsView.tsx`, `web/components/modals/DeployLogModal.tsx`
- **Integrations & Access:** `web/components/views/GitHubView.tsx`, `web/components/modals/ImportProjectModal.tsx`
- **Configuration & Operations:** `web/components/modals/ProjectSettingsModal.tsx`, `web/components/modals/EnvVarsModal.tsx`
- **Diagnostics & Streaming:** `web/components/views/LogsView.tsx`, `web/components/views/TerminalView.tsx`

---

## 3. Audit Limitations

- **Host Environment:** Audit conducted on a Windows development workstation with live deployment to an Ubuntu Linux VPS (`100.125.7.123:8090`).
- **Telemetry Availability:** Host-level CPU and RAM metrics are derived from `/proc/loadavg` and `/proc/meminfo`. Detailed per-container CPU/memory streaming is not yet emitted by the backend API; interfaces must reflect this truth rather than faking numbers.
- **User Validation:** Psychological cognitive load evaluations are based on heuristic UX evaluation and human-centered design principles; continuous usability testing with first-time developers is recommended.

---

## 4. Overall UX Assessment

| Category | Initial Rating | Post-Fix Rating | Evaluation Summary |
|---|---|---|---|
| **Information Architecture** | 8 / 10 | 9 / 10 | Logical top-level categories; unified application lifecycle and diagnostics. |
| **Operational Safety** | 4 / 10 | 9 / 10 | Resolved unconfirmed destructive actions; added clear consequence dialogs. |
| **Telemetry Truthfulness** | 3 / 10 | 9 / 10 | Eliminated fake hardcoded metrics; replaced with live or honest fallback states. |
| **Error Handling & Recovery** | 5 / 10 | 8.5 / 10 | Replaced native alerts with accessible inline banners and actionable steps. |
| **Accessibility (WCAG 2.1 AA)** | 6 / 10 | 9 / 10 | Fixed low-contrast text (>=4.5:1), added focus rings and accessible aria-labels. |
| **Consistency & Polish** | 6 / 10 | 9 / 10 | Standardized English interface terminology, button sizing, and touch targets. |

---

## 5. Confirmed UX Findings Table

| ID | Component / Area | Problem | Severity | User Impact | Status |
|---|---|---|---|---|---|
| **UX-001** | Containers / Deployments / Apps | Unconfirmed destructive actions (Stop, Restart, Rollback, Disconnect) | **P1** | Accidental clicks bring down production containers or cause unplanned rollbacks | **Fixed** |
| **UX-002** | Dashboard / Containers / Deployments | Hardcoded fake metrics (`2.1%` CPU, `128 MB` RAM, `{runningCount \|\| 1}`, `"24s"` duration, `"2d 4h"` uptime) | **P1** | Users make decisions on false data; misinterprets server state | **Fixed** |
| **UX-003** | Modals & Settings | Native browser `alert()` and `confirm()` dialogs used for validation and errors | **P2** | Blocks browser thread, inaccessible to screen readers, poor UX | **Fixed** |
| **UX-004** | GitHub Integration | Missing PAT scope requirements (`repo`, `read:user`) and direct GitHub link | **P2** | First-time developers get blocked or configure insufficient permissions | **Fixed** |
| **UX-005** | Topbar / Terminal / Settings | Inconsistent language mixing Indonesian and English | **P2** | Creates confusion and disorientation for international and novice users | **Fixed** |
| **UX-006** | Monitoring & Dashboard | Static SVG sparklines that do not react to metric values or time range filters | **P2** | Gives false impression of historical trends that don't match reality | **Fixed** |
| **UX-007** | Typography & Interactive Controls | Low text contrast (`text-gray-400` on white) and missing `focus-visible` rings | **P3** | Violates WCAG AA contrast (2.85:1 vs 4.5:1 required); keyboard navigation gaps | **Fixed** |
| **UX-008** | Logs View | Hardcoded Tailscale IP in log stream header | **P3** | Misleading IP information when accessing via custom domain or public IP | **Fixed** |

---

## 6. Detailed Findings & Code Evidence

### UX-001 — Unconfirmed Destructive Actions
- **File Reference:** `web/components/views/ContainersView.tsx` (lines 150-174), `web/components/views/DeploymentsView.tsx` (lines 227-232), `web/components/views/ApplicationsView.tsx` (lines 352-385).
- **Evidence:** In `ContainersView.tsx`, clicking `Square` immediately called `onContainerAction(project, "stop")`. In `DeploymentsView.tsx`, clicking `RotateCcw` immediately called `onRollback(dep.project)`.
- **User Impact:** A misclick or accidental tap on mobile immediately stops a live website or triggers a deployment rollback.
- **Remediation:** Created a shared `ConfirmDialog` modal requiring explicit confirmation for service interruptions, detailing the application name, action consequences, and recovery options.

### UX-002 — Hardcoded & Fabricated Metrics
- **File References:**
  - `web/components/views/ContainersView.tsx` lines 138-144: `{isRunning ? "2.1%" : "0.0%"}` and `{isRunning ? "128 MB" : "0 MB"}`.
  - `web/components/views/DashboardOverviewView.tsx` line 130: `{runningCount || 1}`. When 0 containers are running, it reported `1`. Line 145: static `100%` uptime.
  - `web/components/views/DeploymentsView.tsx` line 196: `{dep.durationMs ? `${Math.round(dep.durationMs / 1000)}s` : "24s"}`.
  - `web/components/views/ApplicationsView.tsx` line 279: hardcoded `"2d 4h"` uptime for all applications.
  - `web/components/views/MonitoringView.tsx` line 67: hardcoded `"Kernel 5.15+ LTS"`.
- **User Impact:** Degrades developer trust. Users cannot know if their container is actually consuming 2% or 95% CPU, or if their application was deployed 2 minutes or 2 days ago.
- **Remediation:** Removed all fabricated metrics. Replaced container stats with accurate status badges and telemetry indicators. Used `runningCount` directly. Used dynamic duration or `"-"` for historical builds without timestamps. Computed real elapsed uptime from `project.created_at`.

### UX-003 — Blocking Native Browser Alerts & Prompts
- **File References:** `web/components/modals/ProjectSettingsModal.tsx` lines 84, 125, 131, 141; `web/components/modals/ImportProjectModal.tsx` line 141; `web/components/views/GitHubView.tsx` line 58.
- **Evidence:** `alert("Masukkan nama domain terlebih dahulu.")`, `alert("Failed to update project: " + ...)`.
- **User Impact:** Disrupts flow, cannot be customized or styled, blocks audio and screen readers, jarring for end users.
- **Remediation:** Implemented inline accessible alert banners (`role="alert"`) with error icons and dismissible status messages.

### UX-004 — Missing GitHub PAT Scope Guidance & Link
- **File References:** `web/components/views/GitHubView.tsx` lines 130-150; `web/components/modals/ImportProjectModal.tsx`.
- **Evidence:** Only displayed placeholder `ghp_xxxxxxxxxxxxxxxxxxxx` without specifying scopes.
- **User Impact:** Users generate tokens without `repo` scope, leading to unexpected 404 or authentication failures when cloning private repos.
- **Remediation:** Added clear badge checklist (`repo`, `read:user`) and an external link button to `https://github.com/settings/tokens/new?scopes=repo,read:user&description=sPanel%20Integration`.

### UX-005 — Inconsistent Mixed Language (Indonesian & English)
- **File References:** `web/components/views/TerminalView.tsx` line 65 ("Pilih Container:"), `web/components/layout/Topbar.tsx` lines 82, 91, 103, 112, 125 ("Beban CPU Kritis", "Container ... Berhenti").
- **Evidence:** Most views are English, but error messages and topbar notifications were hardcoded in Indonesian.
- **User Impact:** Confusing for developers expecting a consistent international developer tool.
- **Remediation:** Standardized all UI copy, anomaly notices, and form labels in clean, professional English.

### UX-006 — Static Non-Reactive Telemetry Charts
- **File References:** `web/components/views/MonitoringView.tsx` lines 124-129; `web/components/views/DashboardOverviewView.tsx`.
- **Evidence:** SVG paths `d="M 0 110 Q 50 90 100 120 T 200 80 T 300 65 T 400 90 T 500 100"` were static and completely ignored metric values and time filters (`1h`, `6h`, `24h`, `7d`).
- **Remediation:** Dynamically generate sparkline curves and charts based on current live CPU/RAM metrics and selected time windows.

### UX-007 — Visual Accessibility & Keyboard Focus
- **File References:** Across all table views and action buttons.
- **Evidence:** Action buttons used `p-1.5` (~26px) without `aria-label`, visible focus rings, or sufficient contrast (`text-gray-400` on white is 2.85:1).
- **Remediation:** Increased touch padding, added `focus-visible:ring-2 focus-visible:ring-indigo-500`, added explicit `aria-label`s, and elevated text colors to `text-gray-500` / `text-gray-600` (>= 4.5:1 contrast).

---

## 7. Accessibility Evaluation (WCAG 2.1 AA)

- **Contrast Ratios:**
  - Before: `text-gray-400` on `#ffffff` = 2.85:1 (FAIL).
  - After: `text-gray-500` on `#ffffff` = 4.61:1 (PASS AA), `text-gray-600` = 7.01:1 (PASS AAA).
- **Keyboard Navigation:** All action buttons, modal triggers, and form fields now support visible `:focus-visible` styling with high-contrast indigo focus rings.
- **Screen Reader Support:** Replaced `alert()` with ARIA `role="alert"` live regions; added descriptive `aria-label` to all icon-only action buttons (e.g. `aria-label="Stop container for project {name}"`).
- **Touch Target Sizes:** Action buttons meet or exceed 36x36px with comfortable tap areas on mobile screens.

---

## 8. Responsive Design & Mobile Usability

- Tables in `ContainersView`, `DeploymentsView`, and `ApplicationsView` wrap inside horizontal overflow containers (`overflow-x-auto`) with sticky labels.
- Modals scale responsively with `max-h-[90vh]` and internal scroll containers so actions remain accessible on mobile viewports.
- Quick action buttons on mobile provide clear icons and touch-friendly padding.
