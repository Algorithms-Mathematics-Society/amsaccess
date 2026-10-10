import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireFirmUser } from "@/lib/server/firmsAuth";

export async function GET() {
  const access = await requireFirmUser();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const result = await callAmsApi("GET", "/talent/stats", null, access.subject);
  if (!result.ok) return NextResponse.json({ error: errorMessage(result.data) }, { status: result.status });
  return NextResponse.json(result.data);
}
