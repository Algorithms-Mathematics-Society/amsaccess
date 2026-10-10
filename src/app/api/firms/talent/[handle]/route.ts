import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireFirmUser } from "@/lib/server/firmsAuth";

export async function GET(_request: Request, context: { params: Promise<{ handle: string }> }) {
  const access = await requireFirmUser();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { handle } = await context.params;
  const result = await callAmsApi("GET", `/talent/candidates/${encodeURIComponent(handle)}`, null, access.subject);
  if (!result.ok) return NextResponse.json({ error: errorMessage(result.data) }, { status: result.status });
  return NextResponse.json(result.data);
}
