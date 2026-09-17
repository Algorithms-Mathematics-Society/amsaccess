import { NextResponse } from "next/server";
import { proxy } from "../../_proxy";

type Ctx = { params: Promise<{ uid: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { uid } = await ctx.params;
  return proxy("GET", `/mail/batches/${uid}`);
}

/** `?action=retry-failed` */
export async function POST(request: Request, ctx: Ctx) {
  const { uid } = await ctx.params;
  const action = new URL(request.url).searchParams.get("action");
  if (action !== "retry-failed") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  return proxy("POST", `/mail/batches/${uid}/retry-failed`, {});
}
