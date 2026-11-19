import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";
import { UUID } from "@/lib/teamSetup";

/** Every submission in the contest — the setter's live view of judging. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ uid: string }> },
) {
  const subject = await requireSubject();
  if (!subject)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const search = new URL(request.url).searchParams;
  const limit = search.get("limit") ?? "100";
  const userUid = search.get("user_uid");
  if (userUid !== null && !UUID.test(userUid))
    return NextResponse.json(
      { error: "A valid participant UID is required." },
      { status: 400 },
    );
  const query = new URLSearchParams({ limit });
  if (userUid !== null) query.set("user_uid", userUid);

  const res = await callAmsApi(
    "GET",
    `/contests/${encodeURIComponent(uid)}/submissions?${query}`,
    null,
    subject,
  );
  if (!res.ok)
    return NextResponse.json(
      { error: errorMessage(res.data) },
      { status: res.status },
    );
  return NextResponse.json(res.data);
}
