import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contests.detail", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["contest", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const res = await callGoApi("GET", `/org/contests/${params.id}`, null, auth.uid);
    if (res.status !== 200) {
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to load contest.",
        res.status,
        res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
      );
    }

    const raw = res.data as Record<string, unknown>;
    return apiOk({
      contest: {
        id: String(raw.id ?? ""),
        org_id: String(raw.org_id ?? ""),
        title: String(raw.title ?? ""),
        description: raw.description == null ? null : String(raw.description),
        start_at: String(raw.start_at ?? ""),
        end_at: String(raw.end_at ?? ""),
        status: String(raw.status ?? "DRAFT"),
        scoring_type: String(raw.scoring_type ?? "ICPC"),
        allowed_languages: Array.isArray(raw.allowed_languages) ? raw.allowed_languages : [],
        plugin_type: raw.plugin_type == null ? (raw.pluginType == null ? "CP" : String(raw.pluginType)) : String(raw.plugin_type),
        plugin_config: raw.plugin_config == null ? (raw.pluginConfig == null ? null : String(raw.pluginConfig)) : String(raw.plugin_config),
      },
      questions: Array.isArray(raw.questions) ? raw.questions : [],
      invites: Array.isArray(raw.invites) ? raw.invites : [],
    });
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contests.update", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-update", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const res = await callGoApi("PUT", `/org/contests/${params.id}`, payload as Record<string, unknown>, auth.uid);
    if (res.status !== 200) {
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to save contest.",
        res.status,
        res.status === 400 ? "BAD_REQUEST" : res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
      );
    }

    return apiOk({ saved: true });
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contests.delete", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-delete", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const res = await callGoApi("DELETE", `/org/contests/${params.id}`, null, auth.uid);
    if (res.status !== 204) {
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to delete contest.",
        res.status,
        res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
      );
    }

    return apiOk({ deleted: true });
  });
}
