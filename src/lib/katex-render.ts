import katex from "katex";

// Shared math rendering for the contest/problem-statement previews. Mirrors the
// desktop contestant renderer (apps/web session/contest) so an author's preview
// matches what contestants see. KaTeX with trust:false + output:"html" emits only
// <span> elements, so a tampered statement can never inject script/handler markup.
export function renderMathHtml(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode,
      throwOnError: false,
      output: "html",
      strict: "ignore",
    });
  } catch {
    return "";
  }
}

const MATH_TOKEN = (n: number) => `@@KMATH${n}@@`;
const CODE_TOKEN = (n: number) => `@@KCODE${n}@@`;

// Lift $...$ / $$...$$ math out of a markdown string into inert tokens BEFORE the
// host renderer escapes/parses it, then re-inject the rendered KaTeX HTML into the
// host's final output. Code regions (``` fences and `inline` spans) are temporarily
// masked so a `$` inside code is never treated as math, then restored verbatim so
// the host renderer styles them exactly as it does today.
//
// The tokens contain no markdown-active or HTML-active characters, so they survive
// the host's HTML-escaping and markdown passes unchanged. Use it as:
//   const { masked, reinject } = extractMath(raw);
//   return reinject(existingRenderer(masked));
export function extractMath(raw: string): {
  masked: string;
  reinject: (html: string) => string;
} {
  const code: string[] = [];
  const math: string[] = [];

  // 1. Mask code so its `$` can't be read as math.
  let s = raw.replace(/```[\s\S]*?```/g, (m) => {
    code.push(m);
    return CODE_TOKEN(code.length - 1);
  });
  s = s.replace(/`[^`\n]+?`/g, (m) => {
    code.push(m);
    return CODE_TOKEN(code.length - 1);
  });

  // 2. Extract math — display $$...$$ before inline $...$. On a KaTeX failure
  //    (rare; throwOnError:false renders an inline error node instead) leave the
  //    original text so nothing is lost.
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, tex: string) => {
    const html = renderMathHtml(tex, true);
    if (!html) return m;
    math.push(html);
    return MATH_TOKEN(math.length - 1);
  });
  s = s.replace(/\$((?:[^$\\]|\\.)+?)\$/g, (m, tex: string) => {
    const html = renderMathHtml(tex, false);
    if (!html) return m;
    math.push(html);
    return MATH_TOKEN(math.length - 1);
  });

  // 3. Restore code verbatim so the host renderer processes it normally.
  s = s.replace(/@@KCODE(\d+)@@/g, (_m, n: string) => code[Number(n)] ?? "");

  const reinject = (html: string) =>
    html.replace(/@@KMATH(\d+)@@/g, (_m, n: string) => math[Number(n)] ?? "");

  return { masked: s, reinject };
}
