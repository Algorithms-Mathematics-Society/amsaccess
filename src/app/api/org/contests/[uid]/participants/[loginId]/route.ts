import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** `?action=revoke` disables a login; `?action=reissue` returns a new password. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ uid: string; loginId: string }> },
) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid, loginId } = await ctx.params;
  const action = new URL(request.url).searchParams.get("action");

  if (action !== "revoke" && action !== "reissue") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const res = await callAmsApi(
    "POST",
    `/contests/${uid}/participants/${encodeURIComponent(loginId)}/${action}`,
    {},
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
