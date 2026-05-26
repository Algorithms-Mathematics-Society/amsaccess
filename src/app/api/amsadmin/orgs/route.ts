import type { NextRequest } from "next/server";
import { apiError } from "@/lib/server/http";
import { callGoApi } from "@/lib/server/auth";
import { isAmsAdminAuthenticated } from "@/lib/server/amsAdmin";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export const dynamic = "force-dynamic";

function getFirebaseAdmin() {
  if (!getApps().length) {
    const adminJson = process.env.FIREBASE_ADMIN_SDK_JSON;
    if (!adminJson) throw new Error("FIREBASE_ADMIN_SDK_JSON not set");
    initializeApp({ credential: cert(JSON.parse(adminJson) as object) });
  }
  return getAuth();
}

export async function GET() {
  if (!(await isAmsAdminAuthenticated())) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  const res = await callGoApi("GET", "/admin/orgs", null, null);
  return Response.json(res.data, { status: res.status });
}

export async function POST(request: NextRequest) {
  if (!(await isAmsAdminAuthenticated())) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  const body = (await request.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name : "";
  const slug = typeof body.slug === "string" ? body.slug : "";
  const ownerEmail = typeof body.owner_email === "string" ? body.owner_email : "";
  const ownerPassword = typeof body.owner_password === "string" ? body.owner_password : "";

  if (!name || !slug || !ownerEmail || !ownerPassword) {
    return apiError("name, slug, owner_email, and owner_password are required.", 400, "BAD_REQUEST");
  }

  let uid: string;
  try {
    const user = await getFirebaseAdmin().createUser({ email: ownerEmail, password: ownerPassword });
    uid = user.uid;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create Firebase user.";
    return apiError(msg, 400, "BAD_REQUEST");
  }

  const res = await callGoApi("POST", "/admin/orgs", { name, slug, owner_firebase_uid: uid }, null);
  if (res.status >= 400) {
    // Roll back Firebase user so we don't leave orphaned accounts
    await getFirebaseAdmin().deleteUser(uid).catch(() => null);
  }
  return Response.json(res.data, { status: res.status });
}
