import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function GET() {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const res = await callAmsApi("GET", "/problems", null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST(request: Request) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { title?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Give the problem a title." }, { status: 400 });

  // Derive a slug when none is given, so the common case is one field.
  const slug =
    (body.slug ?? "").trim() ||
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 160);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return NextResponse.json(
      { error: "Slug must be lowercase letters, digits and hyphens." },
      { status: 400 },
    );
  }

  const res = await callAmsApi("POST", "/problems", { title, slug }, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data, { status: 201 });
}
