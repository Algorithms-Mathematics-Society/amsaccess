import { NextResponse } from "next/server";
import { proxy, readJson } from "../../../mail/_proxy";

type Ctx = { params: Promise<{ uid: string }> };

/** What "Send credentials" would do: who is ready, who already holds one,
 * who has no address. Shown before the button, so the button is not a guess. */
export async function GET(_request: Request, ctx: Ctx) {
  const { uid } = await ctx.params;
  return proxy("GET", `/contests/${uid}/participants/send-credentials`);
}

/**
 * `?action=issue` — credentials for everyone without one. Instant, idempotent.
 * `?action=send`  — queue the credential email. Body: { include_holders?, template_name?, label? }
 *
 * Two actions on purpose: a roster can be issued weeks early and checked,
 * and the emails released on the day you choose.
 */
export async function POST(request: Request, ctx: Ctx) {
  const { uid } = await ctx.params;
  const action = new URL(request.url).searchParams.get("action");
  if (action === "issue") return proxy("POST", `/contests/${uid}/participants/issue`, {});
  if (action === "send") {
    const body = await readJson(request);
    return proxy("POST", `/contests/${uid}/participants/send-credentials`, body, 201);
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
