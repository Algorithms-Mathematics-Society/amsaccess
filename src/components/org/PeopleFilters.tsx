"use client";

/**
 * Find-a-person controls, shared by the Participants and Leaderboard tabs.
 *
 * One bar in both places on purpose: mid-contest staff move between the two
 * constantly, and a search box that sits somewhere different and behaves
 * slightly differently on each tab costs more than it looks like it does.
 */

import { Search, X } from "lucide-react";
import { osLabel, type PeopleFilter } from "@/lib/client/peopleFilter.ts";

export function PeopleFilters({
  value,
  onChange,
  osOptions,
  collegeOptions,
  showing,
  total,
  pending = false,
  placeholder = "Find a candidate by name or handle…",
}: {
  value: PeopleFilter;
  onChange: (next: PeopleFilter) => void;
  osOptions: readonly string[];
  collegeOptions: readonly string[];
  /** How many rows survive, so the count answers "did I filter too hard". */
  showing: number;
  total: number;
  /** Results still reflect the previously applied filter. */
  pending?: boolean;
  placeholder?: string;
}) {
  const active = Boolean(value.needle.trim() || value.os || value.college);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={value.needle}
          onChange={(event) =>
            onChange({ ...value, needle: event.target.value })
          }
          placeholder={placeholder}
          aria-label="Find a candidate"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
        />
      </div>

      {osOptions.length > 0 && (
        <select
          value={value.os}
          onChange={(event) => onChange({ ...value, os: event.target.value })}
          aria-label="Filter by operating system"
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900"
        >
          <option value="">Any OS</option>
          {osOptions.map((os) => (
            <option key={os} value={os}>
              {osLabel(os)}
            </option>
          ))}
        </select>
      )}

      {collegeOptions.length > 0 && (
        <select
          value={value.college}
          onChange={(event) =>
            onChange({ ...value, college: event.target.value })
          }
          aria-label="Filter by college"
          className="max-w-[240px] rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900"
        >
          <option value="">Any college</option>
          {collegeOptions.map((college) => (
            <option key={college} value={college}>
              {college}
            </option>
          ))}
        </select>
      )}

      <div
        className={`flex w-36 shrink-0 items-center justify-end gap-2 ${active || pending ? "" : "invisible"}`}
        aria-hidden={!active && !pending}
      >
          <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">
            {pending ? "Updating…" : `${showing} of ${total}`}
          </span>
          <button
            type="button"
            disabled={!active && !pending}
            onClick={() => onChange({ needle: "", os: "", college: "" })}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-slate-500 hover:text-slate-900"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
      </div>
    </div>
  );
}
