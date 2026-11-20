import { NextResponse } from "next/server";
import { teamAccess } from "@/lib/server/teamAccess";
import { callAmsApi, uploadToAmsApi, errorMessage } from "@/lib/server/amsApi";
import { boundedForm } from "@/lib/server/boundedUpload";
import { PROJECT_LIMIT, UUID } from "@/lib/teamSetup";

// The catalog belongs to the contest's organization; ams-api checks the caller is its staff.
function scoped(request: Request, path: string): string | null {
  const contest = new URL(request.url).searchParams.get("contest_uid");
  if (contest === null) return path;
  return UUID.test(contest) ? `${path}?contest_uid=${contest}` : null;
}
const BAD_CONTEST = () =>
  NextResponse.json({ error: "Unknown contest." }, { status: 400 });
export async function GET(
  request: Request,
  context: { params: Promise<{ action?: string[] }> },
) {
  const subject = await teamAccess();
  if (typeof subject !== "string") return subject;
  const { action = [] } = await context.params;
  if (action.length)
    return NextResponse.json(
      { error: "Unknown project operation." },
      { status: 404 },
    );
  const path = scoped(request, "/projects");
  if (path === null) return BAD_CONTEST();
  const res = await callAmsApi(
    "GET",
    path,
    null,
    subject,
    25000,
    request.signal,
  );
  return NextResponse.json(
    res.ok ? res.data : { error: errorMessage(res.data) },
    { status: res.status, headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(
  request: Request,
  context: { params: Promise<{ action?: string[] }> },
) {
  const subject = await teamAccess();
  if (typeof subject !== "string") return subject;
  const { action = [] } = await context.params;
  if (action.length > 1 || (action.length === 1 && action[0] !== "inspect"))
    return NextResponse.json(
      { error: "Unknown project operation." },
      { status: 404 },
    );
  const path = scoped(
    request,
    action.length ? "/projects/inspect" : "/projects",
  );
  if (path === null) return BAD_CONTEST();
  const length = Number(request.headers.get("content-length"));
  if (length > PROJECT_LIMIT + 65536)
    return NextResponse.json(
      { error: "Package exceeds 32 MiB." },
      { status: 413 },
    );
  let incoming: FormData;
  try {
    incoming = await boundedForm(request, PROJECT_LIMIT + 65536);
  } catch {
    return NextResponse.json(
      { error: "Expected a package upload." },
      { status: 400 },
    );
  }
  const file = incoming.get("package");
  if (
    !(file instanceof File) ||
    !file.name.endsWith(".cxxpkg") ||
    !file.size ||
    file.size > PROJECT_LIMIT
  )
    return NextResponse.json(
      { error: "Choose a nonempty .cxxpkg file up to 32 MiB." },
      { status: 400 },
    );
  const form = new FormData();
  form.set("package", file);
  const res = await uploadToAmsApi(path, form, subject);
  return NextResponse.json(
    res.ok
      ? res.data
      : {
          error:
            res.status === 403
              ? "Project import requires an authorized non-intern staff role. Ask an owner or administrator."
              : errorMessage(res.data),
        },
    { status: res.status, headers: { "Cache-Control": "no-store" } },
  );
}
