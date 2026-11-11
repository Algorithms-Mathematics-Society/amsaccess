import { NextResponse } from 'next/server';
import { teamAccess } from '@/lib/server/teamAccess';
import { uploadToAmsApi, errorMessage } from '@/lib/server/amsApi';
import { boundedForm } from '@/lib/server/boundedUpload';
import { PROJECT_LIMIT } from '@/lib/teamSetup';
export async function POST(request: Request, context: { params: Promise<{ action?: string[] }> }) {
  const subject = await teamAccess();
  if (typeof subject !== 'string') return subject;
  const { action = [] } = await context.params;
  if (action.length > 1 || (action.length === 1 && action[0] !== 'inspect')) return NextResponse.json({ error: 'Unknown project operation.' }, { status: 404 });
  const length = Number(request.headers.get('content-length'));
  if (length > PROJECT_LIMIT + 65536) return NextResponse.json({ error: 'Package exceeds 32 MiB.' }, { status: 413 });
  let incoming: FormData;
  try { incoming = await boundedForm(request, PROJECT_LIMIT + 65536); } catch { return NextResponse.json({ error: 'Expected a package upload.' }, { status: 400 }); }
  const file = incoming.get('package');
  if (!(file instanceof File) || !file.name.endsWith('.cxxpkg') || !file.size || file.size > PROJECT_LIMIT) return NextResponse.json({ error: 'Choose a nonempty .cxxpkg file up to 32 MiB.' }, { status: 400 });
  const form = new FormData(); form.set('package', file);
  const res = await uploadToAmsApi(action.length ? '/projects/inspect' : '/projects', form, subject);
  return NextResponse.json(res.ok ? res.data : { error: res.status === 403 ? 'Project import requires an authorized non-intern staff role. Ask an owner or administrator.' : errorMessage(res.data) }, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
}
