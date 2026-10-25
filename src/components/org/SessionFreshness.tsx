"use client";

import { memo, useSyncExternalStore } from "react";
import { emptySessionSnapshot, getOrgSessionStore } from "@/lib/client/orgSessions";

const getEmpty = () => emptySessionSnapshot;

/** A passive view of the existing entry-status source; never requests data. */
export const SessionFreshness = memo(function SessionFreshness({ contestUid }: { contestUid: string }) {
  const store = getOrgSessionStore(contestUid);
  const { updatedAt, error } = useSyncExternalStore(store.observe, store.getSnapshot, getEmpty);
  if (updatedAt === null) return null;
  const checked = new Date(updatedAt);
  return (
    <p className="mb-3 text-xs text-slate-500">
      Entry status last checked{" "}
      <time dateTime={checked.toISOString()} title={checked.toLocaleString()} className="tabular-nums">
        {checked.toLocaleTimeString()}
      </time>
      {error && <span className="text-amber-700"> · Latest refresh failed; showing last confirmed entries.</span>}
    </p>
  );
});
