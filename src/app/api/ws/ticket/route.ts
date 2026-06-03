import crypto from "crypto";
import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimitAsync } from "@/lib/server/rateLimit";
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

    // Rate-limit per user so a single org account can't hammer the Go API
    // with unlimited job-lookup calls via repeated ticket requests.
    const limited = await checkRequestRateLimitAsync(request, "orgWrite", ["ws-ticket"], auth.uid);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const record = body as Record<string, unknown>;

    // Validate job_type against an explicit allowlist — never interpolate
    // arbitrary user input into a URL path segment.
    const rawJobType = typeof record.job_type === "string" ? record.job_type.trim() : "";
    if (rawJobType !== "" && rawJobType !== "prejudge" && rawJobType !== "generate") {
      return apiError("Invalid job_type.", 400, "BAD_REQUEST");
    }
    const jobType = rawJobType === "generate" ? "generate" : "prejudge";

    // Restrict job_id to a safe character set to prevent path traversal.
    const jobId = typeof record.job_id === "string" ? record.job_id.trim() : "";
    if (!jobId || !/^[a-zA-Z0-9_-]{1,64}$/.test(jobId)) {
      return apiError("job_id must be 1-64 alphanumeric/dash/underscore characters.", 400, "BAD_REQUEST");
    }

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
