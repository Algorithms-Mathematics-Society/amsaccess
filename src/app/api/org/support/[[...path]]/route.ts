import { NextResponse } from "next/server";
import { proxyToAmsApi } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path?: string[] }> };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
async function handle(request: Request, ctx: Context) {
  const subject = await requireSubject();
  if (!subject)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { path = [] } = await ctx.params;
  const valid =
    path.length === 0 ||
    (UUID.test(path[0]) &&
      (path.length === 1 || (path.length === 2 && path[1] === "messages")));
  if (!valid)
    return NextResponse.json(
      { error: "Unknown support route." },
      { status: 404 },
    );
  const search = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["status", "offset", "after"])
    if (search.has(key)) query.set(key, search.get(key)!);
  let body: Record<string, unknown> | null = null;
  if (request.method !== "GET") {
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return NextResponse.json(
          { error: "Invalid request body." },
          { status: 400 },
        );
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }
  }
  const response = await proxyToAmsApi(
    request.method,
    `/org/support${path.length ? "/" + path.join("/") : ""}${query.size ? "?" + query : ""}`,
    body,
    subject,
    { signal: request.signal, timeoutMs: 10000 },
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
