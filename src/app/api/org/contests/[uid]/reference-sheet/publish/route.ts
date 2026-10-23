import { referenceSheetProxy } from "@/lib/server/referenceSheetProxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ uid: string }> },
) {
  return referenceSheetProxy(request, (await context.params).uid, "POST");
}
