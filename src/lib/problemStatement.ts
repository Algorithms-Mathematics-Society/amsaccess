/**
 * Reading a problem statement the way the proctor reads it.
 *
 * The section split and the tab list are ported from the proctor's
 * `app/session/contest/components/markdown.ts`. They are duplicated rather
 * than shared because the two apps ship separately -- the proctor bundles its
 * own UI, so a fix here never reaches an installed client -- but the rules
 * must not drift: a statement that shows three tabs in the exam and one here
 * defeats the point of previewing it.
 *
 * The renderer is this app's own. The proctor's emits markup for its design
 * system's dark surface; the console is light, and importing that stylesheet
 * to preview one statement would be a worse trade than rendering twice.
 */

export type ProblemSectionKey = "statement" | "examples" | "constraints";

/** The projection the API serves, which is the candidate-facing subset. */
export type ProblemProjection = {
  title?: string;
  language?: string;
  standard?: string;
  backfilled?: boolean;
  limits?: { cpu_time_ms?: number; wall_time_ms?: number; memory_mb?: number };
  statement?: { markdown?: string };
  samples?: { input?: string; output?: string; explanation?: string }[];
  families?: Record<
    string,
    { graded?: boolean; gate?: boolean; weight?: number; count?: number; present?: boolean }
  >;
  assets?: { path: string; content_type: string; sha256: string; size_bytes: number }[];
  starter?: { filename?: string; source?: string };
};

/**
 * Split a statement into the proctor's three sections.
 *
 * Headings decide: anything matching examples/samples starts the examples
 * section, constraints/limits starts constraints, any other heading returns
 * to the statement. A statement with no headings at all falls back to the
 * whole document, which is why `statement` is never empty.
 */
export function splitProblemDescription(md: string): Record<ProblemSectionKey, string> {
  const sections: Record<ProblemSectionKey, string[]> = {
    statement: [],
    examples: [],
    constraints: [],
  };
  let current: ProblemSectionKey = "statement";

  for (const line of md.split("\n")) {
    const heading = /^#{1,4}\s+(.+)$/.exec(line.trim());
    if (heading) {
      const title = heading[1].toLowerCase();
      if (/examples?|samples?/.test(title)) current = "examples";
      else if (/constraints?|limits?/.test(title)) current = "constraints";
      else current = "statement";
    }
    sections[current].push(line);
  }

  return {
    statement: sections.statement.join("\n").trim() || md,
    examples: sections.examples.join("\n").trim(),
    constraints: sections.constraints.join("\n").trim(),
  };
}

/** Statement always; the others only when the split found something. */
export function getAvailableProblemTabs(
  sections: Record<ProblemSectionKey, string>,
): ProblemSectionKey[] {
  return (["statement", "examples", "constraints"] as const).filter(
    (key) => key === "statement" || sections[key].trim().length > 0,
  );
}

export const TAB_LABELS: Record<ProblemSectionKey, string> = {
  statement: "Statement",
  examples: "Examples",
  constraints: "Constraints",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

/**
 * Statement images are served per asset, not inlined.
 *
 * A relative path in the markdown refers to an asset in the pack, which this
 * app has no route for, so it is dropped rather than rendered as a broken
 * image. Absolute http(s) and data: images are kept.
 */
function isSafeImageUrl(value: string) {
  if (!value || /[\s"'<>]/.test(value)) return false;
  if (value.startsWith("data:image/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function inline(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, url: string) =>
      isSafeImageUrl(url)
        ? `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" class="my-3 max-h-80 rounded-lg border border-slate-200" />`
        : "",
    )
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, url: string) => {
      // Only http(s): a javascript: or data: href in a statement has no
      // legitimate use and this markup is injected as HTML.
      if (!/^https?:\/\//.test(url) || /[\s"'<>]/.test(url)) return escapeHtml(text);
      return `<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer" class="text-sky-700 underline">${text}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(
      /`([^`]+)`/g,
      '<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800">$1</code>',
    );
}

/**
 * Markdown to HTML, light theme, with copyable sample blocks.
 *
 * Escapes first and renders from the escaped text, so no statement content
 * reaches the DOM as markup. Fenced blocks get a copy button, mirroring the
 * proctor's `enhanceSampleBlocks` -- reading a sample you cannot copy is the
 * difference between checking a statement and transcribing it.
 */
export function renderStatementHtml(md: string): string {
  const lines = escapeHtml(md || "").split("\n");
  const html: string[] = [];
  let inCode = false;
  let code: string[] = [];
  let listOpen = false;
  let blockIndex = 0;

  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };

  const flushCode = () => {
    const body = code.join("\n");
    const key = `sample-${blockIndex++}`;
    html.push(
      `<div class="group relative my-4">` +
        `<button type="button" data-copy-key="${key}" data-copy-sample="${escapeAttribute(body)}" ` +
        `class="absolute right-2 top-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 opacity-0 transition group-hover:opacity-100 hover:bg-slate-50">Copy</button>` +
        `<pre class="overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 pr-16"><code class="font-mono text-[13px] leading-relaxed text-slate-800">${body}</code></pre>` +
        `</div>`,
    );
    code = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      closeList();
      if (inCode) flushCode();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const size =
        level === 1
          ? "mt-6 mb-2 text-lg font-semibold"
          : level === 2
            ? "mt-5 mb-2 text-base font-semibold"
            : "mt-4 mb-1.5 text-sm font-semibold";
      html.push(`<h${level} class="${size} text-slate-900">${inline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.+)$/.exec(line);
    if (bullet) {
      if (!listOpen) {
        html.push('<ul class="my-2 list-disc space-y-1 pl-5 text-slate-700">');
        listOpen = true;
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p class="my-2 leading-relaxed text-slate-700">${inline(line)}</p>`);
  }

  // An unterminated fence still renders its contents rather than dropping them.
  if (inCode && code.length) flushCode();
  closeList();
  return html.join("");
}
