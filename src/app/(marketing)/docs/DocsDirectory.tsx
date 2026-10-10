"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import type { Audience } from "./guides";
import styles from "./docs.module.css";

type Entry = {
  slug: string;
  title: string;
  description: string;
  audience: Audience;
  searchText: string;
};
const filters = [
  { value: "all", label: "All guides" },
  { value: "candidates", label: "Candidates" },
  { value: "organizers", label: "Organizers" },
  { value: "reviewers", label: "Reviewers" },
] as const;
const labels: Record<Audience, string> = {
  everyone: "Start here",
  candidates: "Candidates",
  organizers: "Organizers",
  reviewers: "Reviewers",
};
export function DocsDirectory({ guides }: { guides: Entry[] }) {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<string>("all");
  const input = useRef<HTMLInputElement>(null);
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = guides.filter(
    (guide) =>
      (audience === "all" ||
        guide.audience === audience ||
        guide.audience === "everyone") &&
      terms.every((term) =>
        guide.searchText.toLocaleLowerCase().includes(term),
      ),
  );
  const hasFilters = Boolean(query || audience !== "all");
  function reset() {
    setQuery("");
    setAudience("all");
    input.current?.focus();
  }
  return (
    <section
      className={styles.directory}
      aria-labelledby="guides-title"
      id="guides"
    >
      <div className={styles.directoryHeading}>
        <div>
          <p className={styles.eyebrow}>Find an answer</p>
          <h2 id="guides-title">All guides</h2>
        </div>
        <p
          className={styles.resultCount}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {filtered.length} {filtered.length === 1 ? "guide" : "guides"}
          {audience !== "all" ? " for " + audience : ""}
        </p>
      </div>
      <label className={styles.searchLabel} htmlFor="guide-search">
        Search documentation
      </label>
      <div className={styles.searchBox}>
        <Search size={18} aria-hidden="true" />
        <input
          id="guide-search"
          ref={input}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
            }
          }}
          placeholder="Search setup, camera, submissions…"
          autoComplete="off"
          aria-controls="guide-results"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              input.current?.focus();
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <div
        className={styles.filters}
        role="group"
        aria-label="Filter guides by role"
      >
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={audience === filter.value}
            onClick={() => setAudience(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div id="guide-results">
        {filtered.length ? (
          <ul className={styles.guideList}>
            {filtered.map((guide) => (
              <li key={guide.slug}>
                <Link href={"/docs/" + guide.slug}>
                  <span className={styles.guideRole}>
                    {labels[guide.audience]}
                  </span>
                  <span className={styles.guideDescription}>
                    <h3>{guide.title}</h3>
                    <p>{guide.description}</p>
                  </span>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.emptyState}>
            <Search size={23} aria-hidden="true" />
            <h3>No matching guides yet.</h3>
            <p>
              Try a broader word, such as “setup” or “results”, or browse all
              the guides.
            </p>
            <button type="button" onClick={reset}>
              Reset search and filters{" "}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {hasFilters && filtered.length > 0 && (
        <button type="button" className={styles.resetButton} onClick={reset}>
          Show all guides
        </button>
      )}
    </section>
  );
}
