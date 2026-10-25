import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/**
 * `?action=revoke` disables a login.
 * `?action=reissue` returns a new password once.
 * `?action=reemail` queues a fresh credential email for this participant.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ uid: string; loginId: string }> },
) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid, loginId } = await ctx.params;
  const action = new URL(request.url).searchParams.get("action");

  if (action !== "revoke" && action !== "reissue" && action !== "reemail") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  if (action === "reissue") {
    try {
      const input: unknown = await request.json();
      const requestId = input && typeof input === "object" && "request_id" in input
        ? input.request_id : undefined;
      if (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
        return NextResponse.json({ error: "A valid reissue request ID is required." }, { status: 400 });
      }
      body = { request_id: requestId };
    } catch {
      return NextResponse.json({ error: "A valid reissue request ID is required." }, { status: 400 });
    }
  }

  const res = await callAmsApi(
    "POST",
    `/contests/${uid}/participants/${encodeURIComponent(loginId)}/${action}`,
    body,
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data, { headers: { "Cache-Control": "no-store" } });
}
