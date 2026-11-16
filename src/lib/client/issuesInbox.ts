import { loadSupportInbox, type SupportSummary } from "./support.ts";
import type { NotificationRaw } from "./orgNotifications.ts";

export type ReadinessRow = {
  uid: string;
  device_fingerprint: string;
  os_name: string;
  app_version: string;
  passed: boolean;
  failed_checks: string[];
  display_name: string;
  created_at: string;
};

export type Override = {
  uid: string;
  device_fingerprint: string;
  check_kind: string;
  reason: string;
  expires_at: string;
  revoked: boolean;
  granted_by: string;
};

/** Most urgent first: locked out of a running exam, then asking for help, then blocked at the gate, then support. */
export const INBOX_KINDS = ["resume", "incident", "entry", "ticket"] as const;
export type InboxKind = (typeof INBOX_KINDS)[number];

export type InboxItem = {
  id: string;
  kind: InboxKind;
  uid: string;
  person: string;
  loginId: string;
  detail: string;
  meta: string;
  at: string;
  open: boolean;
  status: string;
};

/** The live status strip's numbers. The inbox counts with this too, so the two never disagree. */
export function countWaitingOnStaff(raw: NotificationRaw) {
  return {
    waiting: raw.resumes.filter((r) => r.status === "pending").length,
    openHelp: raw.incidents.filter((i) => i.status !== "resolved").length,
  };
}

const time = (value: string) => {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
};

/** One prioritised list: open before resolved; open by kind then longest waiting; resolved newest first. */
export function mergeIssues(input: {
  raw: NotificationRaw;
  readiness: ReadinessRow[];
  overrides: Override[];
  tickets: SupportSummary[];
  contestUid: string;
  now: number;
}): InboxItem[] {
  const items: InboxItem[] = [];
  for (const r of input.raw.resumes)
    items.push({
      id: `resume:${r.uid}`, kind: "resume", uid: r.uid,
      person: r.display_name || r.login_id || "Unknown", loginId: r.login_id,
      detail: r.reason || "No reason given.",
      meta: r.resume_count > 0 ? `reopened ${r.resume_count}× already` : "",
      at: r.created_at, open: r.status === "pending", status: r.status,
    });
  for (const i of input.raw.incidents)
    items.push({
      id: `incident:${i.uid}`, kind: "incident", uid: i.uid,
      person: i.display_name || i.login_id || "Unknown", loginId: i.login_id,
      detail: i.message || i.category, meta: [i.category, i.contact].filter(Boolean).join(" · "),
      at: i.created_at, open: i.status !== "resolved", status: i.status,
    });
  // A device reports on every launch; only its latest report says whether it is still blocked.
  const latest = new Map<string, ReadinessRow>();
  for (const row of input.readiness) {
    const prior = latest.get(row.device_fingerprint);
    if (!prior || time(row.created_at) >= time(prior.created_at)) latest.set(row.device_fingerprint, row);
  }
  for (const row of latest.values()) {
    if (row.passed) continue;
    const waived = new Set(input.overrides
      .filter((o) => !o.revoked && o.device_fingerprint === row.device_fingerprint && time(o.expires_at) > input.now)
      .map((o) => o.check_kind));
    const unwaived = row.failed_checks.filter((check) => !waived.has(check));
    const open = row.failed_checks.length === 0 || unwaived.length > 0;
    items.push({
      id: `entry:${row.uid}`, kind: "entry", uid: row.uid,
      person: row.display_name || "Unknown", loginId: "",
      detail: `Failed ${(open ? unwaived : row.failed_checks).join(", ") || "the device check"}`,
      meta: row.os_name, at: row.created_at, open, status: open ? "blocked" : "waived",
    });
  }
  for (const t of input.tickets) {
    if (t.contest_uid !== input.contestUid) continue;
    items.push({
      id: `ticket:${t.uid}`, kind: "ticket", uid: t.uid,
      person: t.name || t.email || "Unknown", loginId: "",
      detail: t.category.toLowerCase().replaceAll("_", " "),
      meta: [t.email, t.phone].filter(Boolean).join(" · "),
      at: t.updated_at, open: t.status === "open", status: t.status,
    });
  }
  return items.sort((a, b) =>
    Number(b.open) - Number(a.open) ||
    (a.open ? INBOX_KINDS.indexOf(a.kind) - INBOX_KINDS.indexOf(b.kind) || time(a.at) - time(b.at) : time(b.at) - time(a.at)) ||
    a.id.localeCompare(b.id));
}

const MAX_TICKET_PAGES = 20;

// shortcut: pages the whole org inbox, add a contest filter to ams-api when tickets grow
// (stops after MAX_TICKET_PAGES pages and reports the list as incomplete).
export async function loadContestTickets(contestUid: string, status: "open" | "resolved", signal?: AbortSignal) {
  const tickets: SupportSummary[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_TICKET_PAGES; page++) {
    const { items, has_more } = await loadSupportInbox(status, offset, signal);
    tickets.push(...items.filter((t) => t.contest_uid === contestUid));
    if (!has_more || items.length === 0) return { tickets, complete: true };
    offset += items.length;
  }
  return { tickets, complete: false };
}
