"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Inbox, Loader2, X } from "lucide-react";
import { useWaitingOnStaff } from "./LiveStatusStrip";
import { useConfirm } from "./ConfirmDialog";
import { startSupportPolling } from "@/lib/client/support-poll";
import type { SupportSummary } from "@/lib/client/support";
import {
  INBOX_KINDS,
  loadContestTickets,
  mergeIssues,
  type InboxItem,
  type InboxKind,
  type Override,
  type ReadinessRow,
} from "@/lib/client/issuesInbox";

const KIND_LABELS: Record<InboxKind, string> = {
  resume: "Re-entry",
  incident: "Help",
  entry: "Entry gate",
  ticket: "Support",
};

const NO_TICKETS: SupportSummary[] = [];

const chip = (on: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-medium ${on ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:border-slate-900"}`;

/**
 * Everything waiting on staff for this contest, in one list: re-entry
 * requests, help requests, entry-gate blocks and this contest's support
 * tickets. Re-entries and help come from the shared notification store and
 * entry-gate reports from the panel, so this adds only the ticket read.
 */
export function IssuesInbox({
  contestUid,
  enabled,
  active,
  readiness,
  overrides,
  renderEntryAction,
}: {
  contestUid: string;
  enabled: boolean;
  active: boolean;
  readiness: ReadinessRow[];
  overrides: Override[];
  renderEntryAction: (row: ReadinessRow) => React.ReactNode;
}) {
  const { feed, waiting, openHelp } = useWaitingOnStaff(contestUid, enabled);
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const [kind, setKind] = useState<InboxKind | "all">("all");
  const [tickets, setTickets] = useState<{ status: string; items: SupportSummary[]; complete: boolean } | null>(null);
  const [ticketError, setTicketError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [dialog, confirm] = useConfirm();
  const list = useRef<HTMLUListElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!enabled || !active) return;
    let stopped = false;
    const stop = startSupportPolling(
      async (signal) => {
        try {
          const result = await loadContestTickets(contestUid, status, signal);
          if (stopped) return;
          setTickets({ status, items: result.tickets, complete: result.complete });
          setTicketError("");
        } catch (e) {
          if (!stopped) setTicketError(e instanceof Error ? e.message : "Support tickets could not be loaded.");
          throw e;
        }
      },
      { minimumMs: 30000, maximumMs: 45000 },
    );
    return () => {
      stopped = true;
      stop();
    };
  }, [contestUid, enabled, active, status]);

  const ticketRows = tickets?.status === status ? tickets.items : NO_TICKETS;
  // Recomputed with each feed or report change; the clock only matters for waiver expiry.
  const items = useMemo(
    () => mergeIssues({ raw: feed.raw, readiness, overrides, tickets: ticketRows, contestUid, now: Date.now() }),
    [feed.raw, readiness, overrides, ticketRows, contestUid],
  );
  const inStatus = useMemo(() => items.filter((item) => item.open === (status === "open")), [items, status]);
  const counts = useMemo(() => {
    const result: Record<InboxKind, number> = { resume: 0, incident: 0, entry: 0, ticket: 0 };
    for (const item of inStatus) result[item.kind]++;
    // Same numbers as the status strip, from the same count.
    if (status === "open") Object.assign(result, { resume: waiting, incident: openHelp });
    return result;
  }, [inStatus, status, waiting, openHelp]);
  const shown = kind === "all" ? inStatus : inStatus.filter((item) => item.kind === kind);
  const total = INBOX_KINDS.reduce((sum, k) => sum + counts[k], 0);

  async function decide(item: InboxItem, action: "approve-resume" | "reject-resume" | "resolve-incident") {
    if (
      action === "reject-resume" &&
      !(await confirm({
        title: `Refuse ${item.person}'s re-entry?`,
        body: <p>They stay locked out of this contest. They can send a new request if they try again.</p>,
        confirmLabel: "Refuse re-entry",
        danger: true,
      }))
    )
      return;
    try {
      await feed.act(item.id, action);
      setAnnouncement(
        action === "approve-resume" ? `${item.person} can re-enter.`
          : action === "reject-resume" ? `Refused ${item.person}'s re-entry.`
          : `Help request from ${item.person} resolved.`,
      );
      list.current?.focus();
    } catch {
      // The store keeps the error on the item; it is shown inline.
    }
  }

  const empty = !enabled
    ? "Not shown for your role. Ask an admin for contest staff access."
    : feed.loading
      ? "Loading…"
      : status === "open"
        ? "Nothing is waiting on staff."
        : "Nothing resolved yet.";

  return (
    <section aria-labelledby={titleId} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      {dialog}
      <h3 id={titleId} className="mb-2 flex flex-wrap items-center gap-2 text-base font-semibold text-slate-900">
        <Inbox className="h-4 w-4" aria-hidden="true" />
        Issues waiting on staff
        {status === "open" && total > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{total}</span>
        )}
      </h3>
      <p className="mb-4 max-w-4xl text-sm leading-relaxed text-slate-500">
        Re-entry requests, help requests, entry-gate blocks and this contest&apos;s support tickets, most urgent first.
        Approving a re-entry issues a 15-minute window to rejoin; it does not reopen a submitted session or give extra time.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <div role="group" aria-label="Status" className="flex gap-1">
          {(["open", "resolved"] as const).map((value) => (
            <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={chip(status === value)}>
              {value === "open" ? "Open" : "Resolved"}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Type" className="flex flex-wrap gap-1">
          <button type="button" aria-pressed={kind === "all"} onClick={() => setKind("all")} className={chip(kind === "all")}>
            All <span className="tabular-nums">{total}</span>
          </button>
          {INBOX_KINDS.map((value) => (
            <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={chip(kind === value)}>
              {KIND_LABELS[value]} <span className="tabular-nums">{counts[value]}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
      {ticketError && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Support tickets could not be loaded: {ticketError}
        </p>
      )}
      {tickets?.status === status && !tickets.complete && (
        <p className="mb-3 text-xs text-slate-500">Only the newest support tickets were checked for this contest.</p>
      )}
      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul ref={list} tabIndex={-1} aria-labelledby={titleId} className="space-y-2 focus:outline-none">
          {shown.map((item) => {
            const busy = feed.busyIds.has(item.id);
            const error = feed.actionErrors[item.id];
            return (
              <li
                key={item.id}
                className={`rounded-xl border bg-white p-4 ${!item.open ? "border-slate-200" : item.kind === "resume" ? "border-red-300" : "border-amber-300"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      {KIND_LABELS[item.kind]}
                      {!item.open && ` · ${item.status.replaceAll("_", " ")}`}
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {item.person}{" "}
                      {item.loginId && <span className="break-all font-mono text-xs text-slate-400">{item.loginId}</span>}
                    </p>
                    <p className="mt-1 break-words text-sm text-slate-700">{item.detail}</p>
                    <p className="mt-1 break-words text-xs text-slate-500">
                      <time dateTime={item.at}>{new Date(item.at).toLocaleTimeString()}</time>
                      {item.meta && ` · ${item.meta}`}
                    </p>
                  </div>
                  <div className="flex w-full flex-shrink-0 gap-2 md:w-auto">
                    {item.open && item.kind === "resume" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void decide(item, "approve-resume")}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40 md:flex-none md:py-1.5"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                          Let them back in
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void decide(item, "reject-resume")}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-xs text-slate-700 hover:border-slate-900 disabled:opacity-40 md:flex-none md:py-1.5"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                          Refuse
                        </button>
                      </>
                    )}
                    {item.open && item.kind === "incident" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void decide(item, "resolve-incident")}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-xs text-slate-700 hover:border-slate-900 disabled:opacity-40 md:w-auto md:py-1.5"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        Mark resolved
                      </button>
                    )}
                    {item.open && item.kind === "entry" && (() => {
                      const row = readiness.find((r) => `entry:${r.uid}` === item.id);
                      return row ? renderEntryAction(row) : null;
                    })()}
                    {item.kind === "ticket" && (
                      <Link
                        href={`/org/support?t=${item.uid}`}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-xs text-slate-700 hover:border-slate-900 md:w-auto md:py-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        Open ticket<span className="sr-only"> from {item.person}</span>
                      </Link>
                    )}
                  </div>
                </div>
                {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
