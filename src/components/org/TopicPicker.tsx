"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Tag, X, Check, Loader2 } from "lucide-react";
import type { TopicGroup } from "@/lib/orgTypes";

/** The vocabulary is fetched once per page, not per picker. Several problem
 * cards open one each and the list never changes within a session. */
let cached: Promise<TopicGroup[]> | null = null;

function loadTopics(): Promise<TopicGroup[]> {
  cached ??= fetch("/api/org/topics", { cache: "no-store" })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Could not load topics.");
      return ((data as { groups?: TopicGroup[] }).groups ?? []) as TopicGroup[];
    })
    .catch((err) => {
      // Don't cache a failure — the next picker should retry rather than
      // inherit a permanently empty list.
      cached = null;
      throw err;
    });
  return cached;
}

export function TopicTags({ tags, groups }: { tags: string[]; groups: TopicGroup[] }) {
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) for (const t of g.topics) map.set(t.slug, t.label);
    return map;
  }, [groups]);

  if (tags.length === 0) {
    return <span className="text-xs text-slate-400">No topics</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((slug) => (
        <span
          key={slug}
          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
        >
          {/* Fall back to the slug: a tag the vocabulary no longer knows
              should still be visible rather than silently vanishing. */}
          {labels.get(slug) ?? slug}
        </span>
      ))}
    </div>
  );
}

export function TopicPicker({
  problemUid,
  selected,
  onSaved,
}: {
  problemUid: string;
  selected: string[];
  onSaved: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<TopicGroup[]>([]);
  const [chosen, setChosen] = useState<string[]>(selected);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTopics().then(setGroups).catch(() => setError("Could not load the topic list."));
  }, []);

  useEffect(() => {
    if (open) setChosen(selected);
  }, [open, selected]);

  const toggle = useCallback((slug: string) => {
    setChosen((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }, []);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((g) => ({
        ...g,
        topics: g.topics.filter(
          (t) => t.label.toLowerCase().includes(needle) || t.slug.includes(needle),
        ),
      }))
      .filter((g) => g.topics.length > 0);
  }, [groups, filter]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/org/problems/${problemUid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: chosen }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Could not save.");
      // Trust the server's list, not the local one: it drops anything the
      // vocabulary does not recognise, and the UI should show what was
      // actually stored.
      onSaved((data as { tags?: string[] }).tags ?? chosen);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save topics.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <TopicTags tags={selected} groups={groups} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <Tag className="h-3 w-3" />
          {selected.length > 0 ? "Edit" : "Add topics"}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter topics…"
          autoFocus
          className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-900"
        />
        <span className="text-xs text-slate-500">{chosen.length} selected</span>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {visible.map((group) => (
          <div key={group.name}>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {group.name}
            </p>
            <div className="flex flex-wrap gap-1">
              {group.topics.map((topic) => {
                const on = chosen.includes(topic.slug);
                return (
                  <button
                    key={topic.slug}
                    type="button"
                    onClick={() => toggle(topic.slug)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                      on
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-500"
                    }`}
                  >
                    {on ? <Check className="h-3 w-3" /> : null}
                    {topic.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="py-4 text-center text-xs text-slate-500">Nothing matches “{filter}”.</p>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          Save topics
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-900"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}
