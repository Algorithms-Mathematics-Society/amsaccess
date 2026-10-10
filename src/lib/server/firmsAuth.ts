import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export type FirmUser = {
  uid: string;
  username: string;
  display_name: string;
  email: string;
  status: string;
  role: string | null;
  organization_name: string | null;
};

const DEFAULT_ROLES = ["owner", "admin", "problemsetter", "firm", "sponsor", "employer"];

export function firmRoles(): Set<string> {
  const configured = process.env.AMS_FIRMS_ALLOWED_ROLES?.split(",")
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
  return new Set(configured?.length ? configured : DEFAULT_ROLES);
}

export function canAccessFirms(user: FirmUser): boolean {
  return user.status === "active" && Boolean(user.role && firmRoles().has(user.role.toLowerCase()));
}

export async function firmUserForSubject(subject: string): Promise<
  | { ok: true; user: FirmUser }
  | { ok: false; status: number; error: string }
> {
  const result = await callAmsApi<FirmUser>("GET", "/auth/me", null, subject);
  if (!result.ok) return { ok: false, status: result.status, error: errorMessage(result.data) };
  if (!canAccessFirms(result.data)) {
    return { ok: false, status: 403, error: "This account is not provisioned for the Firms workspace." };
  }
  return { ok: true, user: result.data };
}

export async function requireFirmUser() {
  const subject = await requireSubject();
  if (!subject) return { ok: false as const, status: 401, error: "Sign in required." };
  const result = await firmUserForSubject(subject);
  return result.ok ? { ok: true as const, subject, user: result.user } : result;
}
