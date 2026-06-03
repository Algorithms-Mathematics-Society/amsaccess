import { apiFetch } from "./apiClient";

export type Org = { id: string; name: string; slug: string };
export type Contest = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  status: string;
  _invite_count?: number;
  _question_count?: number;
};
export type DashboardResponse = { org: Org; contests: Contest[] };

// Two-layer cache:
// 1. If a fresh entry exists (< 30s old), return it synchronously — no network call.
// 2. If a fetch is already in-flight, share it — no duplicate requests on concurrent mount.
// Covers: rapid back-navigation, OrgPortalShell unmount/remount, React StrictMode double-mount.
const CACHE_TTL_MS = 30_000;
let cached: { data: DashboardResponse; fetchedAt: number } | null = null;
let pending: Promise<DashboardResponse> | null = null;

export function fetchOrgDashboard(): Promise<DashboardResponse> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }
  pending ??= apiFetch<DashboardResponse>("/api/org/dashboard")
    .then((data) => {
      cached = { data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function invalidateOrgDashboard(): void {
  cached = null;
}
