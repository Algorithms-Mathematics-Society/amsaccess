"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { startOrgSupportPolling } from "@/lib/client/orgPolling";
import {
  loadSupportInbox,
  type SupportInbox,
  type SupportSummary,
} from "@/lib/client/support";
import { OrgAstryxTheme } from "./OrgAstryxTheme";

const Conversation = dynamic(
  () => import("./SupportInbox").then((module) => module.Conversation),
  { loading: () => <p role="status">Loading conversation…</p> },
);

/** The API proves ownership; contact details never select a person's tickets. */
export function PersonSupportTickets({
  userUid,
  contestUid,
}: {
  userUid: string;
  contestUid: string;
}) {
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    data: SupportInbox;
  } | null>(null);
  const [selected, setSelected] = useState<SupportSummary | null>(null);
  const [error, setError] = useState("");
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    // A settled action can remove its focused button; keep Escape inside the panel.
    if (document.activeElement === document.body) section.current?.focus();
  }, [refresh]);
  const scope = `${contestUid}:${userUid}:${status}:${offset}`;
  const data = snapshot?.scope === scope ? snapshot.data : null;
  useEffect(() => {
    let stopped = false;
    setError("");
    const reset = () => {
      setSnapshot(null);
      setSelected(null);
    };
    window.addEventListener("ams:org-session-reset", reset);
    const stop = startOrgSupportPolling(
      async (signal) => {
        try {
          const page = await loadSupportInbox(
            status,
            offset,
            signal,
            contestUid,
            userUid,
          );
          if (!stopped) {
            setSnapshot({ scope, data: page });
            setError("");
          }
        } catch (failure) {
          if (!stopped) {
            // Do not retain identities after permission loss or an unverified response.
            reset();
            setError(
              failure instanceof Error
                ? failure.message
                : "Could not load this person's tickets.",
            );
          }
          throw failure;
        }
      },
      { minimumMs: 15000, maximumMs: 20000 },
    );
    return () => {
      stopped = true;
      stop();
      window.removeEventListener("ams:org-session-reset", reset);
    };
  }, [contestUid, userUid, status, offset, scope, refresh]);

  const chosen =
    selected?.user_uid === userUid && selected.contest_uid === contestUid
      ? selected
      : null;
  const button =
    "min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
  return (
    <section
      ref={section}
      tabIndex={-1}
      aria-label="Person support tickets"
      className="space-y-3 border-t border-slate-200 pt-4"
    >
      <h4 className="text-sm font-semibold text-slate-900">
        Support tickets in this contest
      </h4>
      <p className="text-xs text-slate-600">
        Only tickets linked to this participant’s authenticated sign-in are
        shown. Guest and unlinked historical tickets remain in the support
        inbox.
      </p>
      <div className="flex flex-wrap gap-2">
        {(["open", "resolved"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={button}
            aria-pressed={status === value}
            onClick={() => {
              setStatus(value);
              setOffset(0);
            }}
          >
            {value === "open" ? "Open tickets" : "Resolved tickets"}
          </button>
        ))}
        <button
          type="button"
          className={button}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh tickets
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!data && !error && (
        <p role="status" className="text-sm text-slate-600">
          Loading linked tickets…
        </p>
      )}
      {data?.items.length === 0 && (
        <p className="text-sm text-slate-600">No {status} linked tickets.</p>
      )}
      {data && (
        <ul className="divide-y divide-slate-200">
          {data.items.map((ticket) => (
            <li
              key={ticket.uid}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <div className="min-w-0 text-sm text-slate-700">
                <span>
                  {ticket.category.toLowerCase().replaceAll("_", " ")}
                </span>
                <span className="ml-2 text-xs">
                  {ticket.status} ·{" "}
                  {new Date(ticket.updated_at).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                className={button}
                onClick={() => setSelected(ticket)}
                aria-pressed={chosen?.uid === ticket.uid}
              >
                Open ticket
              </button>
            </li>
          ))}
        </ul>
      )}
      {(offset > 0 || data?.has_more) && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={button}
            disabled={offset === 0}
            onClick={() => setOffset((value) => Math.max(0, value - 50))}
          >
            Previous tickets
          </button>
          <button
            type="button"
            className={button}
            disabled={!data?.has_more}
            onClick={() => setOffset((value) => value + 50)}
          >
            Next tickets
          </button>
        </div>
      )}
      {chosen && (
        <OrgAstryxTheme>
          <Conversation
            key={`${contestUid}:${userUid}:${chosen.uid}`}
            uid={chosen.uid}
            person={{ userUid, contestUid }}
            onChange={() => setRefresh((value) => value + 1)}
          />
        </OrgAstryxTheme>
      )}
    </section>
  );
}
