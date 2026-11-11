import { NextResponse } from 'next/server';
import { requireSubject } from './session';
import { callAmsApi } from './amsApi';
import { TEAM_WRITERS } from '../teamSetup';
/** Fail closed on new organizer surfaces; backend still checks the target organization. */
export async function teamAccess(): Promise<string | NextResponse> {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({error:'Sign in required.'},{status:401});
  const me = await callAmsApi<{role?:string}>('GET','/auth/me',null,subject);
  if (!me.ok) return NextResponse.json({error:'Could not verify organization access.'},{status:me.status});
  if (!me.data.role || !TEAM_WRITERS.includes(me.data.role)) return NextResponse.json({error:'Team setup and project import require an authorized non-intern staff role.'},{status:403});
  return subject;
}
