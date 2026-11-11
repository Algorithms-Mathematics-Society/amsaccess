import { NextResponse } from 'next/server';
import { teamAccess } from '@/lib/server/teamAccess';
import { callAmsApi, errorMessage } from '@/lib/server/amsApi';
import { UUID, teamAction, validateTeamBody } from '@/lib/teamSetup';

type Context = { params: Promise<{ uid: string; action?: string[] }> };
async function handle(request: Request, context: Context) {
  const subject = await teamAccess();
  if (typeof subject !== 'string') return subject;
  const { uid, action = [] } = await context.params;
  const suffix = teamAction(request.method, action);
  if (!UUID.test(uid) || suffix === null) return NextResponse.json({ error: 'Unknown team operation.' }, { status: 404 });
  let body: Record<string, unknown> | null = null;
  if (request.method === 'PUT' || suffix === '/seed') {
    try { body = validateTeamBody(suffix, await request.json()); }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request.' }, { status: 400 }); }
  }
  const res = await callAmsApi(request.method, `/contests/${uid}/team-round${suffix}`, body, subject, 25000, request.signal);
  return NextResponse.json(res.ok ? res.data : { error: res.status === 403 ? 'Your organization role cannot perform this team operation. Ask an owner or administrator.' : errorMessage(res.data) }, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
}
export const GET = handle;
export const PUT = handle;
export const POST = handle;
