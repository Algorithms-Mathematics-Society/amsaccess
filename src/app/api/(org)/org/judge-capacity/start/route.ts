import { apiError, apiOk } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  return withApiLogging("org.judge_capacity.start", async () => {
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    const res = await callGoApi("POST", "/org/judge-capacity/start", {}, auth.uid);
    if (res.status !== 200) {
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to start judge capacity.",
        res.status,
        "SERVER_ERROR"
      );
    }
    return apiOk(res.data as Record<string, unknown>);
  });
}

