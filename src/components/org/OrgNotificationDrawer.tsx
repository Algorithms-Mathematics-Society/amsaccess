"use client";

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Bell, Check, ChevronDown, ExternalLink, Loader2, RefreshCw, X } from "lucide-react";
import type { OrgNotification } from "@/lib/client/orgNotifications";

type Action = "approve-resume" | "reject-resume" | "resolve-incident";
type Props = {
  items: OrgNotification[];
  loading: boolean;
  updatedAt?: number | null;
  errors: string[];
  busyIds: ReadonlySet<string>;
  actionErrors: Record<string, string>;
  onAction: (id: string, action: Action) => Promise<void>;
  onRefresh: () => Promise<void>;
  onReview?: (item: OrgNotification) => void;
};
type Group = "waiting" | "flags" | "history";
const GROUPS = ["waiting", "flags", "history"] as const;
const LABELS = { waiting: "Waiting", flags: "Flags", history: "History" };
const PAGE_SIZE = 50;
const timeFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const buttonClass = "rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
function timestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : timeFormat.format(date);
}

const NotificationCard = memo(function NotificationCard({ item, busy, error, onAction, onReview }: {
  item: OrgNotification; busy: boolean; error?: string;
  onAction: (id: string, action: Action) => void;
  onReview?: (item: OrgNotification) => void;
}) {
  return <li className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-slate-900">{item.person || item.loginId || "Participant"}</p>
        {item.loginId && item.loginId !== item.person && <p className="break-all text-xs text-slate-500">{item.loginId}</p>}
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${item.pending ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
        {item.kind === "flag" ? `${item.count ?? 1} flags` : item.status === "unconfirmed" ? "Status unconfirmed" : item.status.replaceAll("_", " ")}
      </span>
    </div>
    <p className="mt-2 text-xs font-medium text-slate-600">{item.kind === "resume" ? "Re-entry request" : item.kind === "incident" ? "Help request" : "Integrity flag"}</p>
    {item.message && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{item.message}</p>}
    {item.status === "unconfirmed" && <p className="mt-2 text-xs text-slate-500">No longer in the latest response; it may have been handled elsewhere or omitted by the listing limit.</p>}
    <time dateTime={item.createdAt} className="mt-2 block text-[11px] text-slate-500">{timestamp(item.createdAt)}</time>
    {item.pending && item.kind === "resume" && <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => onAction(item.id, "approve-resume")} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />} Allow re-entry
      </button>
      <button type="button" disabled={busy} onClick={() => onAction(item.id, "reject-resume")} title="Decline this re-entry request; this does not permanently ban the participant" className={buttonClass}>Block request</button>
    </div>}
    {item.pending && item.kind === "incident" && <button type="button" disabled={busy} onClick={() => onAction(item.id, "resolve-incident")} className={`mt-3 inline-flex items-center gap-1.5 ${buttonClass}`}>
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />} Mark resolved
    </button>}
    {item.kind === "flag" && onReview && <button type="button" onClick={() => onReview(item)} className={`mt-3 inline-flex items-center gap-1.5 ${buttonClass}`}><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Review participant</button>}
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </li>;
});

/** Presentation only: the parent owns polling, authorization and retained records. */
export function OrgNotificationDrawer({ items, loading, updatedAt, errors, busyIds, actionErrors, onAction, onRefresh, onReview }: Props) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<Group>("waiting");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [toast, setToast] = useState<OrgNotification | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [reviewedFlags, setReviewedFlags] = useState<Record<string, number>>({});
  const seenIds = useRef<Map<string, number | undefined> | null>(null);
  const inFlight = useRef(new Set<string>());
  const refreshInFlight = useRef(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();
  const grouped = useMemo(() => {
    const result: Record<Group, OrgNotification[]> = { waiting: [], flags: [], history: [] };
    for (const item of items) result[item.kind === "flag" ? "flags" : !item.pending ? "history" : "waiting"].push(item);
    return result;
  }, [items]);
  const attentionCount = grouped.waiting.length + grouped.flags.filter(item => (item.count ?? 1) > (reviewedFlags[item.id] ?? 0)).length;

  useEffect(() => {
    if (!seenIds.current) {
      if (items.length || !loading) seenIds.current = new Map(items.map(item => [item.id, item.count]));
      return;
    }
    const fresh = items.filter(item => item.kind === "flag"
      ? !seenIds.current!.has(item.id) || (item.count ?? 0) > (seenIds.current!.get(item.id) ?? 0)
      : !seenIds.current!.has(item.id) && item.pending);
    for (const item of items) seenIds.current.set(item.id, item.count);
    if (fresh.length) {
      setAnnouncement(`${fresh.length} new admin notification${fresh.length === 1 ? "" : "s"}. Latest: ${fresh[0].person || fresh[0].loginId || "Participant"}.`);
      if (!open) setToast(fresh[0]);
    }
  }, [items, loading, open]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  const close = useCallback(() => { setOpen(false); launcher.current?.focus(); }, []);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [open, close]);
  const act = useCallback(async (id: string, action: Action) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    setLocalErrors(previous => ({ ...previous, [id]: "" }));
    try { await onAction(id, action); }
    catch { setLocalErrors(previous => ({ ...previous, [id]: "Action failed. Please refresh and try again." })); }
    finally { inFlight.current.delete(id); }
  }, [onAction]);
  const review = useCallback((item: OrgNotification) => {
    if (item.kind === "flag") setReviewedFlags(previous => ({ ...previous, [item.id]: item.count ?? 1 }));
    close();
    onReview?.(item);
  }, [close, onReview]);
  const refresh = async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    try { await onRefresh(); }
    catch { setAnnouncement("Notifications could not be refreshed. Please try again."); }
    finally { refreshInFlight.current = false; setRefreshing(false); }
  };
  const reveal = (selected?: Group) => {
    if (selected) { setGroup(selected); setLimit(PAGE_SIZE); }
    setToast(null);
    setOpen(true);
  };

  return <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 max-w-[calc(100vw-2rem)] text-left">
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    {toast && !open && <div className="absolute bottom-16 right-0 flex w-80 max-w-[calc(100vw-2rem)] items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => reveal(toast.kind === "flag" ? "flags" : "waiting")}>
        <span className="block text-xs font-semibold text-slate-900">{toast.kind === "resume" ? "Re-entry request" : toast.kind === "incident" ? "Help request" : "New flag"}</span>
        <span className="mt-1 block truncate text-sm text-slate-600">{toast.person || toast.loginId || "Participant"}</span>
        <span className="mt-1 block text-xs text-slate-500">Open notifications to review</span>
      </button>
      <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification preview; keep in drawer" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" aria-hidden="true" /></button>
    </div>}
    <section id={panelId} role="dialog" aria-modal="false" aria-labelledby={titleId} aria-hidden={!open} inert={!open} className={`absolute bottom-16 right-0 flex h-[min(38rem,calc(100dvh-7rem))] w-96 max-w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-[0.98] opacity-0"}`}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <div><h2 id={titleId} className="text-sm font-semibold text-slate-900">Notifications</h2><p className="text-xs text-slate-500">{attentionCount} awaiting review · this visit</p><p className="text-[11px] text-slate-500">{updatedAt ? `Last checked ${timestamp(new Date(updatedAt).toISOString())}` : "Waiting for first update"}</p></div>
        <div className="flex items-center gap-1">
          <button type="button" disabled={loading || refreshing} onClick={() => void refresh()} aria-label="Refresh notifications" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading || refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" /></button>
          <button ref={closeButton} type="button" onClick={close} aria-label="Close notifications" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><ChevronDown className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </div>
      <div className="flex gap-1 border-b border-slate-200 bg-white p-2" aria-label="Notification groups">
        {GROUPS.map(value => <button key={value} type="button" aria-pressed={group === value} onClick={() => { setGroup(value); setLimit(PAGE_SIZE); }} className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium ${group === value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{LABELS[value]} <span className="tabular-nums">{grouped[value].length}</span></button>)}
      </div>
      {errors.length > 0 && <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><p className="font-medium">Some updates could not be loaded. Showing available notifications.</p>{errors.map((error, index) => <p key={`${index}:${error}`} className="mt-1 break-words">{error}</p>)}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {grouped[group].length === 0 ? <div className="py-10 text-center text-sm text-slate-500">{loading ? "Loading notifications…" : group === "history" ? "Handled requests stay here during this visit." : "No notifications in this group."}</div> : <ul className="space-y-2" aria-label={`${LABELS[group]} notifications`}>{grouped[group].slice(0, limit).map(item => <NotificationCard key={item.id} item={item} busy={busyIds.has(item.id)} error={actionErrors[item.id] || localErrors[item.id]} onAction={act} onReview={onReview ? review : undefined} />)}</ul>}
        {grouped[group].length > limit && <button type="button" onClick={() => setLimit(value => value + PAGE_SIZE)} className={`mt-3 w-full bg-white ${buttonClass}`}>Show more ({grouped[group].length - limit} remaining)</button>}
      </div>
    </section>
    <button ref={launcher} type="button" aria-expanded={open} aria-controls={panelId} aria-haspopup="dialog" aria-label={`${open ? "Close" : "Open"} notifications, ${attentionCount} awaiting review`} onClick={() => open ? close() : reveal()} className="ml-auto flex h-12 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-medium text-white shadow-lg transition-colors hover:bg-slate-800 motion-reduce:transition-none">
      <Bell className="h-5 w-5" aria-hidden="true" /><span>Notifications</span>{attentionCount > 0 && <span className="min-w-5 rounded-full bg-emerald-400 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-950">{attentionCount > 99 ? "99+" : attentionCount}</span>}
    </button>
  </div>;
}
