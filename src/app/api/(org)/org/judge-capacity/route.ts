import { apiError, apiOk } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiLogging("org.judge_capacity.get", async () => {
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    const res = await callGoApi("GET", "/org/judge-capacity", null, auth.uid);
    if (res.status !== 200) {
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to fetch judge capacity.",
        res.status,
        "SERVER_ERROR"
      );
    }
    return apiOk(res.data as Record<string, unknown>);
  });
}

