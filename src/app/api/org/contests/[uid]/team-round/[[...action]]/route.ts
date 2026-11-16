import { NextResponse } from 'next/server';
import { teamAccess } from '@/lib/server/teamAccess';
import { callAmsApi, uploadToAmsApi, errorMessage } from '@/lib/server/amsApi';
import { boundedForm } from '@/lib/server/boundedUpload';
import { PROJECT_LIMIT, UUID, teamAction, validateTeamBody } from '@/lib/teamSetup';

type Context = { params: Promise<{ uid: string; action?: string[] }> };
async function handle(request: Request, context: Context) {
  const subject = await teamAccess();
  if (typeof subject !== 'string') return subject;
  const { uid, action = [] } = await context.params;
  const suffix = teamAction(request.method, action);
  if (!UUID.test(uid) || suffix === null) return NextResponse.json({ error: 'Unknown team operation.' }, { status: 404 });
  if (suffix === '/benchmark-input') {
    // shortcut: ams-api sets no size cap on this input, so the project-pack bound is reused; raise it if real inputs grow past 32 MiB.
    let incoming: FormData;
    try { incoming = await boundedForm(request, PROJECT_LIMIT + 65536); } catch { return NextResponse.json({ error: 'Expected a benchmark input upload.' }, { status: 400 }); }
    const file = incoming.get('input');
    if (!(file instanceof File) || !file.size || file.size > PROJECT_LIMIT) return NextResponse.json({ error: 'Choose a nonempty input file up to 32 MiB.' }, { status: 400 });
    const form = new FormData(); form.set('input', file);
    return reply(await uploadToAmsApi(`/contests/${uid}/team-round/benchmark-input`, form, subject));
  }
  let body: Record<string, unknown> | null = null;
  if (request.method === 'PUT' || suffix === '/seed') {
    try { body = validateTeamBody(suffix, await request.json()); }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request.' }, { status: 400 }); }
  }
  return reply(await callAmsApi(request.method, `/contests/${uid}/team-round${suffix}`, body, subject, 25000, request.signal));
}
const DENIED = 'Your organization role cannot perform this team operation. Ask an owner or administrator.';
// Newer ams-api explains each denial; older servers without a message keep the fixed text.
function reply(res: { ok: boolean; status: number; data: unknown }) {
  return NextResponse.json(res.ok ? res.data : { error: errorMessage(res.data, res.status === 403 ? DENIED : undefined) }, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
}
export const GET = handle;
export const PUT = handle;
export const POST = handle;
