import { NextResponse } from "next/server";
import { proxy } from "../../_proxy";

/** `?action=retry` — one failed recipient back into the queue. */
export async function POST(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const { uid } = await ctx.params;
  const action = new URL(request.url).searchParams.get("action");
  if (action !== "retry") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  return proxy("POST", `/mail/messages/${uid}/retry`, {});
}
