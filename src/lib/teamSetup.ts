/** Shared input bounds; the API remains the authority for organization and phase checks. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PROJECT_LIMIT = 32 * 1024 * 1024;
export const TEAM_WRITERS = ['owner', 'admin', 'problemsetter', 'contest_manager', 'judge_manager'];
export function teamAction(method: string, action: string[]): string | null {
  if (!action.length && ['GET', 'PUT'].includes(method)) return '';
  if (action.length !== 1) return null;
  if (method === 'GET' && action[0] === 'teams') return '/teams';
  if (method === 'POST' && ['seed', 'publish', 'lock-allocation'].includes(action[0])) return '/' + action[0];
  return null;
}
export function validateTeamBody(action: string, value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object.');
  const b = value as Record<string, unknown>;
  const allowed = action === '/seed' ? ['source_contest_uid', 'take', 'add_user_uids', 'method', 'bands', 'reset'] :
    ['project_uid', 'team_size', 'discussion_seconds', 'selection_opens_at', 'allocation_locks_at', 'submit_deadline', 'integration_score', 'benchmark_enabled', 'benchmark_cooldown_seconds'];
  if (Object.keys(b).some(k => !allowed.includes(k))) throw new Error('Unexpected field.');
  for (const k of ['source_contest_uid', 'project_uid']) if (k in b && (typeof b[k] !== 'string' || !UUID.test(b[k] as string))) throw new Error('Use a valid project or contest UID.');
  if (action === '/seed' && !b.source_contest_uid) throw new Error('Choose a source contest.');
  const ranges: Record<string, [number, number]> = { team_size: [1, 5], discussion_seconds: [0, 3600], take: [1, 2000], bands: [1, 50], integration_score: [0, 1000000], benchmark_cooldown_seconds: [0, 86400] };
  for (const [key, [min, max]] of Object.entries(ranges)) if (key in b && (!Number.isInteger(b[key]) || Number(b[key]) < min || Number(b[key]) > max)) throw new Error(`${key} must be an integer from ${min} to ${max}.`);
  for (const key of ['reset', 'benchmark_enabled']) if (key in b && typeof b[key] !== 'boolean') throw new Error(`${key} must be true or false.`);
  for (const key of ['selection_opens_at', 'allocation_locks_at', 'submit_deadline']) if (key in b && (typeof b[key] !== 'string' || !Number.isFinite(Date.parse(b[key] as string)))) throw new Error(`Invalid ${key}.`);
  if ('method' in b && !['snake', 'tiered', 'banded'].includes(String(b.method))) throw new Error('Invalid seeding method.');
  if ('add_user_uids' in b && (!Array.isArray(b.add_user_uids) || b.add_user_uids.length > 100 || b.add_user_uids.some(v => typeof v !== 'string' || !UUID.test(v)))) throw new Error('Additions must contain at most 100 user UIDs.');
  if (Array.isArray(b.add_user_uids) && new Set(b.add_user_uids).size !== b.add_user_uids.length) throw new Error('Remove duplicate additions.');
  if (b.selection_opens_at && b.allocation_locks_at && Date.parse(String(b.selection_opens_at)) + Number(b.discussion_seconds ?? 120) * 1000 >= Date.parse(String(b.allocation_locks_at))) throw new Error('Allocation must lock after discussion ends.');
  if (b.allocation_locks_at && b.submit_deadline && Date.parse(String(b.allocation_locks_at)) > Date.parse(String(b.submit_deadline))) throw new Error('Submission deadline must not precede allocation lock.');
  return b;
}
