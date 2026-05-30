import { apiError, apiOk } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string; questionId: string } }) {
  return withApiLogging("org.contest_question_tests.get", async () => {
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const res = await callGoApi("GET", `/org/contests/${params.id}/questions/${params.questionId}/tests`, null, auth.uid);
    if (res.status !== 200) {
      const code =
        typeof res.data === "object" && res.data && "code" in res.data
          ? String((res.data as { code: unknown }).code)
          : (res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR");
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to load tests.",
        res.status,
        code
      );
    }

    return apiOk(res.data as Record<string, unknown>);
  });
}
