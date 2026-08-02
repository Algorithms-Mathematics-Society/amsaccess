import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

const VIEWS = new Set(["readiness", "overrides", "incidents"]);

/** `?view=readiness|overrides|incidents` — one route for the console's tab. */
export async function GET(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const view = new URL(request.url).searchParams.get("view") ?? "";
  if (!VIEWS.has(view)) {
    return NextResponse.json({ error: "Unknown view." }, { status: 400 });
  }

  const res = await callAmsApi("GET", `/contests/${uid}/invigilation/${view}`, null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}

/**
 * `?action=grant-override` | `revoke-override&uid=` | `resolve-incident&uid=`
 *
 * One route rather than four: they share the same auth and contest scoping,
 * and splitting them would repeat that four times for no gain.
 */
export async function POST(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const params = new URL(request.url).searchParams;
  const action = params.get("action");
  const target = params.get("uid") ?? "";

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // revoke and resolve carry no body.
  }

  let path: string;
  if (action === "grant-override") {
    if (!body.device_fingerprint || !body.check_kind) {
      return NextResponse.json(
        { error: "Pick a device and a check to waive." },
        { status: 400 },
      );
    }
    path = `/contests/${uid}/invigilation/overrides`;
  } else if (action === "revoke-override" && target) {
    path = `/contests/${uid}/invigilation/overrides/${encodeURIComponent(target)}/revoke`;
  } else if (action === "resolve-incident" && target) {
    path = `/contests/${uid}/invigilation/incidents/${encodeURIComponent(target)}/resolve`;
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const res = await callAmsApi("POST", path, body, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
