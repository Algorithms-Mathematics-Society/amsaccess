"use client";

/**
 * Loading shapes for the org console.
 *
 * Every panel used to print the word "Loading…", which tells a reader
 * nothing they had not already worked out and leaves the page to jump when
 * the data lands. Drawing the shape that is about to appear reserves the
 * space and says what kind of thing is coming.
 *
 * One file so the shimmer, the radius and the greys stay the same
 * everywhere: a console where each panel invents its own loading state looks
 * unfinished in a way that is hard to point at.
 */

/** A text-sized bar. Use where a sentence or a count will appear. */
export function SkeletonText({ className = "w-40" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block h-4 animate-pulse rounded bg-slate-200 align-middle ${className}`}
    />
  );
}

/** A filled region. Use for a card or a chart. */
export function SkeletonBlock({ className = "h-32" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

/** A table: a header band and `rows` body bands, inside the usual card. */
export function SkeletonTable({ rows = 6, bare = false }: { rows?: number; bare?: boolean }) {
  const body = (
    <>
      <span className="sr-only">Loading</span>
      <div aria-hidden="true" className="mb-3 h-8 w-full animate-pulse rounded bg-slate-100" />
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="mb-2 h-9 w-full animate-pulse rounded bg-slate-50"
        />
      ))}
    </>
  );
  if (bare) return <div aria-busy="true">{body}</div>;
  return (
    <div aria-busy="true" className="rounded-xl border border-slate-200 bg-white p-4">
      {body}
    </div>
  );
}
