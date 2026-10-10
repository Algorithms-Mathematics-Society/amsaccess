import type { ReleaseSummary } from "@/lib/releases";

/**
 * Release history, read from the releases themselves.
 *
 * The hand-written changelog this replaces said v0.2.0, May 2026, while the
 * product shipped v2.3.1. Nothing in the page could have caught that: a
 * changelog kept separately from the releases it describes is a second
 * source of truth, and it only ever drifts one way.
 *
 * Notes are rendered as plain text, not Markdown. A release body is written
 * for GitHub and arrives with headings, checklists and commit trailers;
 * rendering it faithfully means importing a Markdown pipeline onto a
 * marketing page to display text most readers skim. The first few lines,
 * readable, are worth more than all of it, styled.
 */

function firstLines(notes: string, max = 3): string[] {
  return notes
    .split("\n")
    .map((line) => line.replace(/^[#>*\-\s]+/, "").trim())
    .filter((line) => line.length > 0 && !line.startsWith("<!--"))
    .slice(0, max);
}

export function ReleaseHistory({ releases }: { releases: ReleaseSummary[] }) {
  if (releases.length === 0) {
    return (
      <p className="text-sm text-muted">
        Release history is unavailable right now. Every build is listed on GitHub.
      </p>
    );
  }

  return (
    <ol className="border-l border-line">
      {releases.map((release, index) => (
        <li key={release.version} className="relative pb-8 pl-7 last:pb-0">
          <span
            className={`absolute -left-[4px] top-2 h-[7px] w-[7px] rounded-full ${
              index === 0 ? "bg-violet" : "bg-muted"
            }`}
            aria-hidden
          />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <a
              href={release.releaseUrl}
              className="font-mono text-sm text-violet underline-offset-4 hover:underline"
            >
              {release.version}
            </a>
            <span className="text-xs text-muted">
              {new Date(release.publishedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            {index === 0 && (
              <span className="rounded-control bg-violet-soft px-2 py-0.5 text-[11px] font-semibold text-violet">
                Current
              </span>
            )}
          </div>

          {firstLines(release.notes).length > 0 && (
            <ul className="mt-2 space-y-1">
              {firstLines(release.notes).map((line, i) => (
                <li key={i} className="text-sm leading-6 text-muted">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
