import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { checkRequestRateLimitAsync } from "@/lib/server/rateLimit";
import { callGoApi, getFirebaseAdmin } from "@/lib/server/auth";
import { isAmsAdminAuthenticated } from "@/lib/server/amsAdmin";
import { logger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

function serviceUid(): string {
  const uid = process.env.AMSADMIN_SERVICE_UID ?? "";
  if (!uid) throw new Error("AMSADMIN_SERVICE_UID env var not set.");
  return uid;
}

export async function GET(request: NextRequest) {
  const limited = await checkRequestRateLimitAsync(request, "privateRead", ["amsadmin-orgs"]);
  if (limited.limited) return apiRateLimited(limited.retryAfter);
  if (!(await isAmsAdminAuthenticated())) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  try {
    const res = await callGoApi("GET", "/admin/orgs", null, serviceUid());
    return apiOk(res.data);
  } catch (err) {
    logger.error("amsadmin.orgs.get_failed", { message: err instanceof Error ? err.message : String(err) });
    return apiError("Unable to retrieve organizations.", 500, "SERVER_ERROR");
  }
}

export async function POST(request: NextRequest) {
  const limited = await checkRequestRateLimitAsync(request, "adminWrite", ["amsadmin-orgs"]);
  if (limited.limited) return apiRateLimited(limited.retryAfter);
  if (!(await isAmsAdminAuthenticated())) return apiError("Unauthorized.", 401, "UNAUTHORIZED");

  const body = (await request.json()) as Record<string, unknown>;
  // Enforce length limits before passing to Firebase/Go API
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().slice(0, 60) : "";
  const ownerEmail = typeof body.owner_email === "string" ? body.owner_email.trim().slice(0, 254) : "";
  const ownerPassword = typeof body.owner_password === "string" ? body.owner_password.slice(0, 128) : "";

  if (!name || !slug || !ownerEmail || !ownerPassword) {
    return apiError("name, slug, owner_email, and owner_password are required.", 400, "BAD_REQUEST");
  }

  let svcUid: string;
  try {
    svcUid = serviceUid();
  } catch (err) {
    logger.error("amsadmin.orgs.service_uid_missing", { message: err instanceof Error ? err.message : String(err) });
    return apiError("Server configuration error.", 500, "SERVER_ERROR");
  }

  let newUserUid: string;
  let userWasPreExisting = false;
  try {
    const user = await getFirebaseAdmin().createUser({ email: ownerEmail, password: ownerPassword });
    newUserUid = user.uid;
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "auth/email-already-exists") {
      try {
        const existing = await getFirebaseAdmin().getUserByEmail(ownerEmail);
        newUserUid = existing.uid;
        userWasPreExisting = true;
      } catch {
        return apiError("Firebase user already exists but could not be retrieved.", 400, "BAD_REQUEST");
      }
    } else if (code === "auth/invalid-email") {
      return apiError("Invalid email address.", 400, "BAD_REQUEST");
    } else if (code === "auth/weak-password") {
      return apiError("Password is too weak.", 400, "BAD_REQUEST");
    } else {
      // Log internally but never send Firebase SDK error strings to the client
      logger.error("amsadmin.orgs.firebase_create_failed", { code: code ?? "unknown" });
      return apiError("Unable to create user account.", 400, "BAD_REQUEST");
    }
  }

  const res = await callGoApi("POST", "/admin/orgs", {
    name,
    slug,
    owner_firebase_uid: newUserUid,
    owner_email: ownerEmail,
  }, svcUid);

  if (res.status >= 400 && !userWasPreExisting) {
    await getFirebaseAdmin().deleteUser(newUserUid).catch(() => null);
  }

  if (res.status >= 500) {
    return apiError("Unable to create organization.", res.status, "SERVER_ERROR");
  }

  return apiOk(res.data, { status: res.status === 201 ? 201 : 200 });
}
