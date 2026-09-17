import { NextResponse } from "next/server";
import { proxy, readJson } from "../../_proxy";

type Ctx = { params: Promise<{ name: string }> };

const NAME = /^[a-z0-9][a-z0-9-]{1,63}$/;

async function safeName(ctx: Ctx): Promise<string | null> {
  const { name } = await ctx.params;
  return NAME.test(name) ? name : null;
}

export async function GET(_request: Request, ctx: Ctx) {
  const name = await safeName(ctx);
  if (!name) return NextResponse.json({ error: "Bad template name." }, { status: 400 });
  return proxy("GET", `/mail/templates/${name}`);
}

export async function PUT(request: Request, ctx: Ctx) {
  const name = await safeName(ctx);
  if (!name) return NextResponse.json({ error: "Bad template name." }, { status: 400 });
  const body = await readJson(request);
  return proxy("PUT", `/mail/templates/${name}`, { ...body, name });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const name = await safeName(ctx);
  if (!name) return NextResponse.json({ error: "Bad template name." }, { status: 400 });
  return proxy("DELETE", `/mail/templates/${name}`);
}

/** `?action=preview` — render with sample data plus whatever is posted. */
export async function POST(request: Request, ctx: Ctx) {
  const name = await safeName(ctx);
  if (!name) return NextResponse.json({ error: "Bad template name." }, { status: 400 });
  const action = new URL(request.url).searchParams.get("action");
  if (action !== "preview") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const body = await readJson(request);
  return proxy("POST", `/mail/templates/${name}/preview`, { data: body.data ?? {} });
}
