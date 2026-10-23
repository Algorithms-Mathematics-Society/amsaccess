import { referenceSheetProxy } from "@/lib/server/referenceSheetProxy";

type Context = { params: Promise<{ uid: string }> };
export async function GET(request: Request, context: Context) {
  return referenceSheetProxy(request, (await context.params).uid, "GET");
}
export async function PUT(request: Request, context: Context) {
  return referenceSheetProxy(request, (await context.params).uid, "PUT");
}
