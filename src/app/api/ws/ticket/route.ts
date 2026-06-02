import crypto from "crypto";
import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { requireOrgUser, callGoApi } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET ?? "";

/**
 * POST /api/ws/ticket
 * Body: { job_id: string }
 *
 * Returns a short-lived (60 s) HMAC-signed ticket the browser passes as
 * ?ticket=<value> when connecting to the Go WebSocket endpoint.
 * Ticket format: <base64url(json_payload)>.<hex(hmac-sha256)>
 */
export async function POST(request: NextRequest) {
  return withApiLogging("ws.ticket.create", async () => {
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const record = body as Record<string, unknown>;
    const jobId = typeof record.job_id === "string" ? record.job_id.trim() : "";
    const jobType = typeof record.job_type === "string" ? record.job_type.trim() : "prejudge";
    if (!jobId) return apiError("job_id required.", 400, "BAD_REQUEST");

    // Confirm the job exists and belongs to this user's org.
    const lookupPath = jobType === "generate" ? `/org/generate-jobs/${jobId}` : `/org/prejudge-jobs/${jobId}`;
    const res = await callGoApi("GET", lookupPath, null, auth.uid);
    if (res.status !== 200) {
      return apiError("Job not found or access denied.", 403, "FORBIDDEN");
    }

    if (!INTERNAL_API_SECRET) {
      return apiError("WS ticket signing not configured.", 500, "SERVER_ERROR");
    }

    const payload = JSON.stringify({
      job_id: jobId,
      uid: auth.uid,
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    const b64 = Buffer.from(payload).toString("base64url");
    const sig = crypto.createHmac("sha256", INTERNAL_API_SECRET).update(b64).digest("hex");
    const ticket = `${b64}.${sig}`;

    return apiOk({ ticket });
  });
}
