import { NextResponse } from "next/server";
import { proxy, readJson } from "../mail/_proxy";

/** What is judging right now: live workers, their idle time, the backlog,
 * and what size the schedule currently justifies.
 *
 * Read-only and open to any org staff member — noticing that judging has
 * stalled is not a privileged act. Changing the size is, and the API gates
 * that on owner/admin.
 */
export async function GET() {
  return proxy("GET", "/fleet");
}

/**
 * `?action=warm` | `stand-down`
 *
 * Both spend money and both expire on the far side: a forgotten warm is
 * about $79 a day, a forgotten stand-down is a contest whose judges never
 * arrive.
 */
export async function POST(request: Request) {
  const action = new URL(request.url).searchParams.get("action");
  if (action !== "warm" && action !== "stand-down") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  return proxy("POST", `/fleet/${action}`, await readJson(request));
}

/** Hand control back to the schedule now, rather than waiting the override out. */
export async function DELETE() {
  return proxy("DELETE", "/fleet/override");
}
