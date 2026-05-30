import { apiError, apiOk } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  return withApiLogging("org.judge_capacity.stop", async () => {
    if (!process.env.GO_API_URL) {
      return apiError("GO_API_URL is not configured on web deployment.", 503, "SERVER_ERROR");
    }
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    let res;
    try {
      res = await callGoApi("POST", "/org/judge-capacity/stop", {}, auth.uid);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown upstream error";
      return apiError(`Judge capacity upstream unavailable: ${message}`, 503, "SERVER_ERROR");
    }
    if (res.status !== 200) {
      const code =
        typeof res.data === "object" && res.data && "code" in res.data
          ? String((res.data as { code: unknown }).code)
          : "SERVER_ERROR";
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to stop judge capacity.",
        res.status,
        code
      );
    }
    return apiOk(res.data as Record<string, unknown>);
  });
}
