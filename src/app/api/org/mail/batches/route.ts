import { NextResponse } from "next/server";
import { proxy, readJson } from "../_proxy";

export async function GET() {
  return proxy("GET", "/mail/batches");
}

/**
 * Queue a template to a roster and/or a pasted list. Nothing is sent from
 * this request — the API's drain sends on its own timer, and the batch page
 * shows each recipient's row move from queued to sent.
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (typeof body.template_name !== "string" || !body.template_name) {
    return NextResponse.json({ error: "Pick a template." }, { status: 400 });
  }
  return proxy("POST", "/mail/batches", body, 201);
}
