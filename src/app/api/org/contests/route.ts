import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function GET() {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const res = await callAmsApi("GET", "/contests", null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST(request: Request) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Give the contest a title." }, { status: 400 });

  const slug =
    String(body.slug ?? "").trim() ||
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160);

  const startsAt = String(body.starts_at ?? "");
  const endsAt = String(body.ends_at ?? "");
  if (!startsAt || !endsAt) {
    return NextResponse.json({ error: "Set a start and end time." }, { status: 400 });
  }
  // Caught here as well as in the API: the browser is where it is fixable,
  // and a contest that ends before it starts is never a typo worth storing.
  if (new Date(endsAt) <= new Date(startsAt)) {
    return NextResponse.json({ error: "The contest must end after it starts." }, { status: 400 });
  }

  const res = await callAmsApi(
    "POST",
    "/contests",
    {
      title,
      slug,
      starts_at: startsAt,
      ends_at: endsAt,
      description: String(body.description ?? ""),
      visibility: String(body.visibility ?? "invite_only"),
      freeze_minutes_before_end: Number(body.freeze_minutes_before_end ?? 0),
      is_practice: Boolean(body.is_practice ?? false),
    },
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data, { status: 201 });
}
