"use client";

import { useEffect, useMemo, useState } from "react";
import { extractMath } from "@/lib/katex-render";
import MarkovEditor from "@/components/MarkovEditor";
import { normalizeChain, type MarkovChain } from "@/lib/markov";

// Lives here (lazy-loaded) rather than in the contest page so its KaTeX import
// (via extractMath) and the MarkovEditor canvas stay out of the page's initial
// bundle — they load only when a markov question is opened.
function renderMarkdownPreview(md: string): string {
  // Pull $...$ / $$...$$ math out to KaTeX before the markdown pass, then
  // re-inject the rendered HTML into the final output (see extractMath).
  const { masked, reinject } = extractMath(md);
  // Minimal markdown → HTML for problem statement preview
  let html = masked
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // fenced code blocks
    .replace(/```[\s\S]*?```/g, (m) => {
      const inner = m.slice(3, -3).replace(/^\w*\n/, "");
      return `<pre style="background:#0f172a;border-radius:6px;padding:8px 12px;overflow-x:auto;font-size:12px;color:#94a3b8;margin:8px 0">${inner}</pre>`;
    })
    // headers
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:600;margin:10px 0 4px;color:#e2e8f0">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:600;margin:12px 0 4px;color:#e2e8f0">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:18px;font-weight:700;margin:14px 0 4px;color:#f1f5f9">$1</h1>')
    // inline code
    .replace(/`([^`]+)`/g, '<code style="background:#1e293b;border-radius:3px;padding:1px 5px;font-size:12px;color:#c084fc;font-family:monospace">$1</code>')
    // bold / italic
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // images — render inline
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:6px 0;display:block" />')
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#a855f7;text-decoration:underline">$1</a>');
  // (math is handled by extractMath/KaTeX above — no literal $…$ remain here)

  // paragraphs: split by blank lines
  const paras = html.split(/\n{2,}/);
  const rendered = paras
    .map((p) => {
      p = p.trim();
      if (!p) return "";
      if (p.startsWith("<h") || p.startsWith("<pre") || p.startsWith("<img")) return p;
      return `<p style="margin:6px 0;line-height:1.6;color:#cbd5e1;font-size:13px">${p.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
  return reinject(rendered);
}

// Keep the KaTeX/markdown render off the per-keystroke path.
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function MarkovQuestionEditor({
  description,
  setDescription,
  markovChain,
  setMarkovChain,
}: {
  description: string;
  setDescription: (v: string) => void;
  markovChain: MarkovChain;
  setMarkovChain: (v: MarkovChain) => void;
}) {
  const dDesc = useDebouncedValue(description, 250);
  const previewHtml = useMemo(() => renderMarkdownPreview(dDesc), [dDesc]);
  const jsonText = useMemo(() => JSON.stringify(normalizeChain(markovChain), null, 2), [markovChain]);

  return (
    <div className="mb-4">
      {/* Problem statement + live preview */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Problem Statement</label>
          <textarea
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the Markov chain problem the student must solve…"
            className="glass-input w-full text-sm font-mono"
            style={{ resize: "vertical", minHeight: 160 }}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Preview</label>
          <div
            style={{
              minHeight: 160,
              background: "rgba(7,17,36,0.7)",
              border: "1px solid rgba(100,116,139,0.18)",
              borderRadius: 8,
              padding: "10px 14px",
              overflowY: "auto",
              maxHeight: 320,
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml || '<span style="color:#475569;font-size:12px">Preview will appear here…</span>' }}
          />
        </div>
      </div>

      {/* Answer key editor + live JSON */}
      <label className="mb-1 block text-xs font-medium text-slate-500">
        Answer Key — build the correct Markov chain below
      </label>
      <p className="mb-2 text-[11px] text-slate-400">
        Double-click canvas to add state · Drag to move · Right-click state to toggle initial/accepting · Click arrow label to edit probability
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 12, alignItems: "start" }}>
        <MarkovEditor value={markovChain} onChange={setMarkovChain} />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Live JSON</label>
          <pre
            style={{
              background: "#0a0f1e",
              border: "1px solid rgba(168,85,247,0.18)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 10.5,
              color: "#94a3b8",
              overflowY: "auto",
              maxHeight: 460,
              margin: 0,
              fontFamily: "monospace",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {jsonText}
          </pre>
        </div>
      </div>
    </div>
  );
}
