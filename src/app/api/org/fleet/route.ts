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
 * `?action=warm` | `stand-down` | `probe` | `bench`
 *
 * Both spend money and both expire on the far side: a forgotten warm is
 * about $79 a day, a forgotten stand-down is a contest whose judges never
 * arrive.
 */
const ACTIONS = new Set(["warm", "stand-down", "probe", "bench"]);

export async function POST(request: Request) {
  const action = new URL(request.url).searchParams.get("action") ?? "";
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  // A probe is one job and takes no body; the rest carry options.
  const body = action === "probe" ? {} : await readJson(request);
  // Probe and bench are accepted-and-still-running (202); warm and
  // stand-down have already taken effect by the time they answer (200).
  // Forcing one status onto both would lie about which happened.
  const queued = action === "probe" || action === "bench";
  return proxy("POST", `/fleet/${action}`, body, queued ? 202 : undefined);
}

/** Hand control back to the schedule now, rather than waiting the override out. */
export async function DELETE() {
  return proxy("DELETE", "/fleet/override");
}
