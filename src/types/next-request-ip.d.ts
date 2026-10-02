// Type-only shim. Next 15 removed `NextRequest.ip`. src/lib/server/request.ts
// still reads it and is kept byte-identical on purpose (backend frozen). At
// runtime `ip` is now always undefined; on Vercel `x-real-ip` is read first, so
// behavior is unchanged. Replace this shim with a one-line request.ts change
// only with explicit approval.
import "next/server";

declare module "next/server" {
  interface NextRequest {
    readonly ip?: string;
  }
}
