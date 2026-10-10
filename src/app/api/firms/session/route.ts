import { NextResponse } from "next/server";
import { requireFirmUser } from "@/lib/server/firmsAuth";

export async function GET() {
  const access = await requireFirmUser();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  return NextResponse.json({ user: access.user });
}
