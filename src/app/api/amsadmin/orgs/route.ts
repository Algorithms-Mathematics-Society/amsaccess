import type { NextRequest } from "next/server";
import { apiError } from "@/lib/server/http";
import { callGoApi, getFirebaseAdmin } from "@/lib/server/auth";
import { isAmsAdminAuthenticated } from "@/lib/server/amsAdmin";

export const dynamic = "force-dynamic";

function serviceUid(): string {
  const uid = process.env.AMSADMIN_SERVICE_UID ?? "";
  if (!uid) throw new Error("AMSADMIN_SERVICE_UID env var not set.");
  return uid;
}

export async function GET() {
  if (!(await isAmsAdminAuthenticated())) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  try {
    const res = await callGoApi("GET", "/admin/orgs", null, serviceUid());
    return Response.json(res.data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error.";
    return apiError(msg, 500, "SERVER_ERROR");
  }
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

  let svcUid: string;
  try {
    svcUid = serviceUid();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error.";
    return apiError(msg, 500, "SERVER_ERROR");
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
    } else {
      const msg = e instanceof Error ? e.message : "Failed to create Firebase user.";
      return apiError(msg, 400, "BAD_REQUEST");
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
  return Response.json(res.data, { status: res.status });
}
