import { NextResponse } from "next/server";
import { getEnvStatus } from "@/lib/server/env";
import { noStoreHeaders } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnvStatus();

  return NextResponse.json(
    {
      ok: env.ok,
      service: "ams-access-web",
      checks: {
        env: env.ok ? "ok" : "invalid"
      }
    },
    {
      status: env.ok ? 200 : 503,
      headers: noStoreHeaders()
    }
  );
}
