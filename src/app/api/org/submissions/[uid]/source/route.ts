/**
 * A submission's source, for staff reviewing a candidate's work.
 *
 * Proxied rather than linked: ams-api returns the text inside an
 * authenticated request instead of a presigned S3 URL, so a link to exam
 * source cannot outlive the page or be forwarded to someone without an
 * account.
 */

import { proxy } from "../../../mail/_proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return proxy("GET", `/submissions/${encodeURIComponent(uid)}/source`);
}
