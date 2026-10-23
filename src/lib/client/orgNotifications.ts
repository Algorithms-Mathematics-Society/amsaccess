export type Incident = {
  uid: string;
  category: string;
  message: string;
  contact: string;
  status: string;
  created_at: string;
  display_name: string;
  login_id: string;
};

export type ResumeRequest = {
  uid: string;
  status: string;
  reason: string;
  device_fingerprint: string;
  created_at: string;
  session_uid: string;
  display_name: string;
  login_id: string;
  resume_count: number;
};

export type SessionRow = {
  uid: string;
  /** The person, not the session. Null on a row the API served before this
   *  field existed, which simply renders as unlinked text. */
  user_uid: string | null;
  login_id: string;
  display_name: string;
  status: string;
  started_at: string | null;
  last_seen_at: string | null;
  violation_count: number;
  resume_count: number;
  // Computed by the API against its own clock, never here — a console laptop
  // an hour out would otherwise paint the whole room as stalled.
  idle_seconds: number | null;
  resume_pending: boolean;
  // Presence, not the image. The roster is polled every ten seconds by every
  // open console, so the photographs themselves are fetched one at a time,
  // for the candidate actually being looked at.
  has_entry_photo: boolean;
  has_exit_photo: boolean;
  entry_photo_at: string | null;
  exit_photo_at: string | null;
};

export type OrgNotification = {
  id: string; contestUid: string; kind: "resume" | "incident" | "flag";
  person: string; loginId: string; message: string; createdAt: string;
  status: string; pending: boolean; count?: number; targetUid: string;
};
export type NotificationRaw = { resumes: ResumeRequest[]; incidents: Incident[]; sessions: SessionRow[] };
export type NotificationAction = "approve-resume" | "reject-resume" | "resolve-incident";
export type NotificationStream = keyof NotificationRaw;

/** API rows are flat JSON records. Preserve identities across equal polling responses,
 * including all fields used by the invigilation table, not just drawer fields. */
export function reuseNotificationRows<T extends object>(previous: T[], incoming: T[]): T[] {
  if (previous.length !== incoming.length) return incoming;
  let unchanged = true;
  const rows = incoming.map((row,index) => {
    const prior = previous[index];
    if (Object.is(prior,row)) return prior;
    if (prior && row) {
      const keys = Object.keys(row) as Array<keyof T>;
      if (keys.length === Object.keys(prior).length && keys.every(key => Object.prototype.hasOwnProperty.call(prior,key) && Object.is(prior[key],row[key]))) return prior;
    }
    unchanged = false;
    return row;
  });
  return unchanged ? previous : rows;
}

/** Retain history, while never presenting a missing request as actionable. */
export function reconcileNotifications(previous: OrgNotification[], contestUid: string, stream: NotificationStream, raw: NotificationRaw, now: string): OrgNotification[] {
  const kind = stream === "resumes" ? "resume" : stream === "incidents" ? "incident" : "flag";
  const priorById = new Map(previous.map(p => [p.id,p]));
  const incoming: OrgNotification[] = stream === "resumes" ? raw.resumes.filter(r => r && typeof r.uid === "string" && r.uid.length > 0).map(r => ({
    id: `resume:${r.uid}`, contestUid, kind, targetUid:r.uid,
    person:r.display_name || r.login_id, loginId:r.login_id, message:r.reason || "Waiting for permission to resume.",
    createdAt:r.created_at, status:r.status, pending:r.status === "pending",
  })) : stream === "incidents" ? raw.incidents.filter(r => r && typeof r.uid === "string" && r.uid.length > 0).map(r => ({
    id:`incident:${r.uid}`, contestUid, kind, targetUid:r.uid,
    person:r.display_name || r.login_id, loginId:r.login_id, message:r.message || r.category,
    createdAt:r.created_at, status:r.status, pending:r.status !== "resolved",
  })) : raw.sessions.filter(r => r && typeof r.uid === "string" && r.uid.length > 0 && r.violation_count > 0).map(r => ({
    id:`flag:${r.uid}`, contestUid, kind, targetUid:r.uid,
    person:r.display_name || r.login_id, loginId:r.login_id,
    message:`${r.violation_count} recorded violation${r.violation_count === 1 ? "" : "s"}.`,
    createdAt:(priorById.get(`flag:${r.uid}`)?.count === r.violation_count ? priorById.get(`flag:${r.uid}`)?.createdAt : undefined) || now,
    status:"recorded", pending:false, count:r.violation_count,
  }));
  const next = new Map(previous.filter(p => p.contestUid === contestUid).map(p => [p.id,p]));
  let changed = next.size !== previous.length;
  const present = new Set(incoming.map(p => p.id));
  for (const [id,p] of next) if (p.kind === kind && p.pending && !present.has(id)) { next.set(id,{...p,pending:false,status:"unconfirmed"}); changed = true; }
  for (const p of incoming) {
    const prior = next.get(p.id);
    const unchanged = prior && (Object.keys(p) as Array<keyof OrgNotification>).every(key => prior[key] === p[key]);
    next.set(p.id,unchanged ? prior : p);
    if (!unchanged) changed = true;
  }
  if (!changed) return previous;
  const result = [...next.values()].sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
  return result.length === previous.length && result.every((item,index) => item === previous[index]) ? previous : result;
}
