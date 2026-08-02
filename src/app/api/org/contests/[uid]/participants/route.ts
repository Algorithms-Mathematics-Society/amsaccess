import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

// One provisioning call per contest is normal; 2000 is the API's own cap.
const MAX_PER_BATCH = 2000;

export async function GET(_request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const res = await callAmsApi("GET", `/contests/${uid}/participants`, null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;

  let body: { names?: string[]; participants?: { display_name: string; external_ref?: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // The UI pastes a roster as lines; accept either that or the structured form.
  const participants =
    body.participants ??
    (body.names ?? []).map((line) => {
      // "Asha Rao, ROLL-101" — the reference is optional and comma-separated.
      const [name, ref] = line.split(",");
      return { display_name: (name ?? "").trim(), external_ref: (ref ?? "").trim() };
    });

  const cleaned = participants.filter((p) => p.display_name.length > 0);
  if (cleaned.length === 0) {
    return NextResponse.json({ error: "Add at least one participant." }, { status: 400 });
  }
  if (cleaned.length > MAX_PER_BATCH) {
    return NextResponse.json(
      { error: `Provision at most ${MAX_PER_BATCH} at a time.` },
      { status: 413 },
    );
  }

  const res = await callAmsApi(
    "POST",
    `/contests/${uid}/participants`,
    { participants: cleaned },
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });

  // 201 with the passwords in it. This response is the only time they exist —
  // the client must persist them before navigating away.
  return NextResponse.json(res.data, { status: 201 });
}
