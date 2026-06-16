"use client";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { MarkovState, MarkovTransition, MarkovChain } from "@/lib/markov";

// Types + normalizeChain now live in @/lib/markov (dependency-free) so callers
// can use them without importing this component. Re-exported here for callers
// that import them alongside the editor.
export type { MarkovState, MarkovTransition, MarkovChain } from "@/lib/markov";
export { normalizeChain } from "@/lib/markov";

const RADIUS = 28;
const ARROW_HEAD = 10;
const CANVAS_W = 820;
const CANVAS_H = 460;

// ─── Helpers ──────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/** Perpendicular offset so bidirectional arrows don't overlap. */
function edgePoints(
  states: MarkovState[],
  transitions: MarkovTransition[],
  t: MarkovTransition
): { x1: number; y1: number; x2: number; y2: number; cx: number; cy: number } {
  const src = states.find((s) => s.id === t.from)!;
  const dst = states.find((s) => s.id === t.to)!;
  if (!src || !dst) return { x1: 0, y1: 0, x2: 0, y2: 0, cx: 0, cy: 0 };

  const hasReverse = transitions.some((o) => o.from === t.to && o.to === t.from);
  const dx = dst.x - src.x;
  const dy = dst.y - src.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  // perpendicular unit
  const px = -ny;
  const py = nx;

  const offset = hasReverse ? 18 : 0;

  const x1 = src.x + nx * RADIUS + px * offset;
  const y1 = src.y + ny * RADIUS + py * offset;
  const x2 = dst.x - nx * RADIUS + px * offset;
  const y2 = dst.y - ny * RADIUS + py * offset;

  // slight curve control point
  const mx = (x1 + x2) / 2 + px * 20;
  const my = (y1 + y2) / 2 + py * 20;

  return { x1, y1, x2, y2, cx: mx, cy: my };
}

/** Self-loop path above the state. */
function selfLoopPath(cx: number, cy: number): string {
  const r = RADIUS;
  const lx = cx - r * 0.8;
  const ly = cy - r;
  const rx = cx + r * 0.8;
  const ry = cy - r;
  return `M ${lx} ${ly} C ${lx} ${cy - r * 2.8} ${rx} ${cy - r * 2.8} ${rx} ${ry}`;
}

function selfLoopMidPoint(cx: number, cy: number): { x: number; y: number } {
  return { x: cx, y: cy - RADIUS * 2.4 };
}

// ─── Component ────────────────────────────────────────────────
interface Props {
  value: MarkovChain;
  onChange: (chain: MarkovChain) => void;
  readOnly?: boolean;
}

export default function MarkovEditor({ value, onChange, readOnly = false }: Props) {
  const [mode, setMode] = useState<"select" | "transition">("select");
  const [drawFrom, setDrawFrom] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ type: "state" | "transition"; id: string } | null>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  // Live position of the state being dragged. Kept local so a drag re-renders
  // only this editor (cheap SVG), not the parent form + its KaTeX preview. The
  // move is committed to `onChange` once, on mouse-up.
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [editingProb, setEditingProb] = useState<{ id: string; val: string } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nextIdx = useRef(value.states.length);

  // sync nextIdx when loaded from outside
  useEffect(() => {
    const maxN = value.states.reduce((m, s) => {
      const n = parseInt(s.id.replace(/\D/g, ""), 10);
      return isNaN(n) ? m : Math.max(m, n + 1);
    }, 0);
    nextIdx.current = maxN;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function svgCoords(e: React.MouseEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }

  // ── Add state on double-click empty canvas ──────────────────
  function handleSvgDoubleClick(e: React.MouseEvent) {
    if (readOnly || mode !== "select") return;
    // only if clicked on the background rect
    if ((e.target as Element).tagName !== "rect") return;
    const { x, y } = svgCoords(e);
    const id = `q${nextIdx.current++}`;
    onChange({
      ...value,
      states: [...value.states, { id, x, y, isInitial: value.states.length === 0, isAccepting: false }],
    });
    setSelected({ type: "state", id });
  }

  // ── State mouse events ──────────────────────────────────────
  function handleStateMouseDown(e: React.MouseEvent, stateId: string) {
    e.stopPropagation();
    if (e.button === 2) return; // right-click handled by onContextMenu
    if (readOnly) return;
    if (mode === "transition") {
      if (!drawFrom) {
        setDrawFrom(stateId);
      } else {
        // create transition
        const already = value.transitions.find((t) => t.from === drawFrom && t.to === stateId);
        if (!already) {
          onChange({
            ...value,
            transitions: [...value.transitions, { id: uid(), from: drawFrom, to: stateId, probability: "0" }],
          });
        }
        setDrawFrom(null);
        setMode("select");
      }
      return;
    }
    setSelected({ type: "state", id: stateId });
    const s = value.states.find((st) => st.id === stateId)!;
    const { x, y } = svgCoords(e);
    setDragging({ id: stateId, ox: x - s.x, oy: y - s.y });
  }

  function handleSvgMouseMove(e: React.MouseEvent) {
    const pos = svgCoords(e);
    setMousePos(pos);
    if (!dragging || readOnly) return;
    const x = Math.max(RADIUS, Math.min(CANVAS_W - RADIUS, pos.x - dragging.ox));
    const y = Math.max(RADIUS, Math.min(CANVAS_H - RADIUS, pos.y - dragging.oy));
    // Update local position only — no parent onChange on every pixel.
    setDragPos({ id: dragging.id, x, y });
  }

  function handleSvgMouseUp() {
    // Commit the final dragged position to the parent exactly once.
    if (dragging && dragPos) {
      onChange({
        ...value,
        states: value.states.map((s) =>
          s.id === dragPos.id ? { ...s, x: dragPos.x, y: dragPos.y } : s
        ),
      });
    }
    setDragPos(null);
    setDragging(null);
  }

  // ── Delete selected ─────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (readOnly || !selected) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (selected.type === "state") {
        onChange({
          states: value.states.filter((s) => s.id !== selected.id),
          transitions: value.transitions.filter((t) => t.from !== selected.id && t.to !== selected.id),
        });
      } else {
        onChange({ ...value, transitions: value.transitions.filter((t) => t.id !== selected.id) });
      }
      setSelected(null);
    },
    [readOnly, selected, value, onChange]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Toggle initial/accepting on right-click ─────────────────
  function handleStateContextMenu(e: React.MouseEvent, stateId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly) return;
    // cycle: normal → initial → accepting → both → normal
    onChange({
      ...value,
      states: value.states.map((s) => {
        if (s.id !== stateId) return s;
        if (!s.isInitial && !s.isAccepting) return { ...s, isInitial: true };
        if (s.isInitial && !s.isAccepting) return { ...s, isAccepting: true };
        if (s.isInitial && s.isAccepting) return { ...s, isInitial: false };
        return { ...s, isAccepting: false };
      }),
    });
  }

  // ── Probability editing ─────────────────────────────────────
  function startEditProb(e: React.MouseEvent, transId: string, current: string) {
    e.stopPropagation();
    if (readOnly) return;
    setEditingProb({ id: transId, val: current });
  }

  function commitProb(transId: string, val: string) {
    onChange({
      ...value,
      transitions: value.transitions.map((t) =>
        t.id === transId ? { ...t, probability: val.trim() || "0" } : t
      ),
    });
    setEditingProb(null);
  }

  // ── Clear drawFrom on Escape ────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawFrom(null);
        setMode("select");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Render ──────────────────────────────────────────────────
  // Apply the in-progress drag position so nodes/edges follow the cursor without
  // a parent update. Identical to value.states when not dragging.
  const renderStates = dragPos
    ? value.states.map((s) => (s.id === dragPos.id ? { ...s, x: dragPos.x, y: dragPos.y } : s))
    : value.states;
  const selState = selected?.type === "state" ? renderStates.find((s) => s.id === selected.id) : null;

  return (
    <div style={{ fontFamily: "inherit" }}>
      {/* Toolbar */}
      {!readOnly && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => { setMode("select"); setDrawFrom(null); }}
            style={toolBtn(mode === "select")}
          >
            ↖ Select / Move
          </button>
          <button
            type="button"
            onClick={() => { setMode("transition"); setDrawFrom(null); }}
            style={toolBtn(mode === "transition")}
          >
            → Add Transition
          </button>
          <button
            type="button"
            onClick={() => {
              const id = `q${nextIdx.current++}`;
              onChange({
                ...value,
                states: [...value.states, { id, x: 80 + (value.states.length % 5) * 140, y: 80 + Math.floor(value.states.length / 5) * 120, isInitial: value.states.length === 0, isAccepting: false }],
              });
            }}
            style={toolBtn(false)}
          >
            + Add State
          </button>
          {selected && (
            <button
              type="button"
              onClick={() => {
                if (selected.type === "state") {
                  onChange({
                    states: value.states.filter((s) => s.id !== selected.id),
                    transitions: value.transitions.filter((t) => t.from !== selected.id && t.to !== selected.id),
                  });
                } else {
                  onChange({ ...value, transitions: value.transitions.filter((t) => t.id !== selected.id) });
                }
                setSelected(null);
              }}
              style={{ ...toolBtn(false), borderColor: "#ef4444", color: "#ef4444" }}
            >
              ✕ Delete
            </button>
          )}
          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>
            {mode === "transition"
              ? drawFrom
                ? `Click target state (or Esc to cancel)`
                : "Click source state"
              : "Dbl-click canvas to add state · Right-click state to toggle initial/accepting"}
          </span>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{
          width: "100%",
          height: CANVAS_H,
          background: "#0a0f1e",
          borderRadius: 10,
          border: "1px solid rgba(168,85,247,0.18)",
          cursor: dragging ? "grabbing" : mode === "transition" ? "crosshair" : "default",
          display: "block",
        }}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onDoubleClick={handleSvgDoubleClick}
        onClick={() => { if (mode === "select") setSelected(null); }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
          </marker>
          <marker id="arrow-sel" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#c084fc" />
          </marker>
        </defs>

        {/* Background click target */}
        <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="transparent" />

        {/* Ghost arrow while drawing */}
        {drawFrom && mousePos && (() => {
          const src = renderStates.find((s) => s.id === drawFrom);
          if (!src) return null;
          return (
            <line
              x1={src.x} y1={src.y} x2={mousePos.x} y2={mousePos.y}
              stroke="#a855f766" strokeWidth={2} strokeDasharray="6 3"
            />
          );
        })()}

        {/* Transitions */}
        {value.transitions.map((t) => {
          const isSel = selected?.type === "transition" && selected.id === t.id;
          if (t.from === t.to) {
            // self-loop
            const src = renderStates.find((s) => s.id === t.from);
            if (!src) return null;
            const mid = selfLoopMidPoint(src.x, src.y);
            return (
              <g key={t.id} onClick={(e) => { e.stopPropagation(); setSelected({ type: "transition", id: t.id }); }}>
                <path
                  d={selfLoopPath(src.x, src.y)}
                  fill="none"
                  stroke={isSel ? "#c084fc" : "#a855f7"}
                  strokeWidth={isSel ? 2.5 : 1.8}
                  markerEnd={`url(#${isSel ? "arrow-sel" : "arrow"})`}
                  style={{ cursor: "pointer" }}
                />
                <ProbLabel
                  x={mid.x} y={mid.y}
                  transId={t.id}
                  value={t.probability}
                  editing={editingProb?.id === t.id}
                  editVal={editingProb?.val ?? ""}
                  onStartEdit={(e) => startEditProb(e, t.id, t.probability)}
                  onCommit={(v) => commitProb(t.id, v)}
                  onEditChange={(v) => setEditingProb((ep) => ep ? { ...ep, val: v } : null)}
                  readOnly={readOnly}
                />
              </g>
            );
          }

          const pts = edgePoints(renderStates, value.transitions, t);
          const d = `M ${pts.x1} ${pts.y1} Q ${pts.cx} ${pts.cy} ${pts.x2} ${pts.y2}`;
          const lx = 0.5 * pts.x1 + 0.5 * pts.cx * 0.5 + 0.25 * pts.x2 + 0.5 * 0.25 * pts.cx;
          const ly = 0.5 * pts.y1 + 0.5 * pts.cy * 0.5 + 0.25 * pts.y2 + 0.5 * 0.25 * pts.cy;
          // simpler: midpoint of quadratic at t=0.5
          const mlx = 0.25 * pts.x1 + 0.5 * pts.cx + 0.25 * pts.x2;
          const mly = 0.25 * pts.y1 + 0.5 * pts.cy + 0.25 * pts.y2;
          void lx; void ly;

          return (
            <g key={t.id} onClick={(e) => { e.stopPropagation(); setSelected({ type: "transition", id: t.id }); }}>
              <path
                d={d}
                fill="none"
                stroke={isSel ? "#c084fc" : "#a855f7"}
                strokeWidth={isSel ? 2.5 : 1.8}
                markerEnd={`url(#${isSel ? "arrow-sel" : "arrow"})`}
                style={{ cursor: "pointer" }}
              />
              <ProbLabel
                x={mlx} y={mly}
                transId={t.id}
                value={t.probability}
                editing={editingProb?.id === t.id}
                editVal={editingProb?.val ?? ""}
                onStartEdit={(e) => startEditProb(e, t.id, t.probability)}
                onCommit={(v) => commitProb(t.id, v)}
                onEditChange={(v) => setEditingProb((ep) => ep ? { ...ep, val: v } : null)}
                readOnly={readOnly}
              />
            </g>
          );
        })}

        {/* States */}
        {renderStates.map((s) => {
          const isSel = selected?.type === "state" && selected.id === s.id;
          const isDrawSrc = drawFrom === s.id;
          return (
            <g
              key={s.id}
              onMouseDown={(e) => handleStateMouseDown(e, s.id)}
              onContextMenu={(e) => handleStateContextMenu(e, s.id)}
              style={{ cursor: dragging?.id === s.id ? "grabbing" : readOnly ? "default" : "grab" }}
            >
              {/* Accepting: double ring */}
              {s.isAccepting && (
                <circle cx={s.x} cy={s.y} r={RADIUS + 6} fill="none" stroke={isSel ? "#c084fc" : "#a855f7"} strokeWidth={2} strokeDasharray="4 2" />
              )}
              <circle
                cx={s.x} cy={s.y} r={RADIUS}
                fill={isSel ? "rgba(168,85,247,0.25)" : isDrawSrc ? "rgba(168,85,247,0.35)" : "rgba(168,85,247,0.12)"}
                stroke={isSel || isDrawSrc ? "#c084fc" : "#a855f7"}
                strokeWidth={isSel ? 2.5 : 1.8}
              />
              {/* Initial: inward arrow indicator */}
              {s.isInitial && (
                <line
                  x1={s.x - RADIUS - 22} y1={s.y}
                  x2={s.x - RADIUS - 2} y2={s.y}
                  stroke="#a855f7" strokeWidth={2}
                  markerEnd="url(#arrow)"
                />
              )}
              <text
                x={s.x} y={s.y + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={13} fontWeight={600}
                fill={isSel ? "#c084fc" : "#e2d9f3"}
                style={{ userSelect: "none", pointerEvents: "none" }}
              >
                {s.id}
              </text>
              {/* Labels for initial/accepting */}
              {(s.isInitial || s.isAccepting) && (
                <text
                  x={s.x} y={s.y + RADIUS + 14}
                  textAnchor="middle"
                  fontSize={9} fill="#94a3b8"
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  {s.isInitial && s.isAccepting ? "start · accept" : s.isInitial ? "start" : "accept"}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Selection info bar */}
      {selState && !readOnly && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8", display: "flex", gap: 16 }}>
          <span>Selected: <b style={{ color: "#c084fc" }}>{selState.id}</b></span>
          <span>Right-click to toggle: <b style={{ color: "#94a3b8" }}>{selState.isInitial ? "start " : ""}{selState.isAccepting ? "accepting" : ""}</b></span>
        </div>
      )}

      {/* Validation hint */}
      {!readOnly && <ValidationHint chain={value} />}
    </div>
  );
}

// ─── Probability label (inline editable) ──────────────────────
function ProbLabel({
  x, y, transId, value, editing, editVal,
  onStartEdit, onCommit, onEditChange, readOnly,
}: {
  x: number; y: number; transId: string; value: string;
  editing: boolean; editVal: string;
  onStartEdit: (e: React.MouseEvent) => void;
  onCommit: (v: string) => void;
  onEditChange: (v: string) => void;
  readOnly: boolean;
}) {
  void transId;
  if (editing) {
    return (
      <foreignObject x={x - 28} y={y - 12} width={56} height={24}>
        <input
          // @ts-expect-error xmlns not typed but required
          xmlns="http://www.w3.org/1999/xhtml"
          autoFocus
          value={editVal}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={() => onCommit(editVal)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit(editVal);
            if (e.key === "Escape") onCommit(value);
          }}
          style={{
            width: "100%", height: "100%", background: "#1e1b4b",
            border: "1px solid #a855f7", borderRadius: 4, color: "#c084fc",
            fontSize: 11, textAlign: "center", padding: "0 2px",
          }}
        />
      </foreignObject>
    );
  }
  return (
    <g onClick={readOnly ? undefined : onStartEdit} style={{ cursor: readOnly ? "default" : "text" }}>
      <rect x={x - 20} y={y - 10} width={40} height={20} rx={4} fill="#0f172a" stroke="#a855f744" strokeWidth={1} />
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#c084fc" style={{ userSelect: "none" }}>
        {value}
      </text>
    </g>
  );
}

// ─── Validation hint ───────────────────────────────────────────
function ValidationHint({ chain }: { chain: MarkovChain }) {
  const errors: string[] = [];

  // Each state's outgoing probs should sum to ~1
  for (const s of chain.states) {
    const outs = chain.transitions.filter((t) => t.from === s.id);
    if (outs.length === 0) continue;
    const sum = outs.reduce((acc, t) => acc + parseProb(t.probability), 0);
    if (Math.abs(sum - 1) > 0.001) {
      errors.push(`${s.id}: outgoing probabilities sum to ${sum.toFixed(3)} (must be 1.0)`);
    }
  }

  const initials = chain.states.filter((s) => s.isInitial);
  if (initials.length === 0 && chain.states.length > 0) errors.push("No initial state set (right-click a state)");
  if (initials.length > 1) errors.push("Multiple initial states");

  if (errors.length === 0) return null;
  return (
    <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
      {errors.map((e, i) => (
        <li key={i} style={{ fontSize: 11, color: "#f87171", display: "flex", alignItems: "center", gap: 4 }}>
          <span>⚠</span> {e}
        </li>
      ))}
    </ul>
  );
}

/** Returns a copy of the chain with x/y stripped from states (for storage/display). */
function parseProb(s: string): number {
  s = s.trim();
  const slash = s.indexOf("/");
  if (slash >= 0) {
    const num = parseFloat(s.slice(0, slash));
    const den = parseFloat(s.slice(slash + 1));
    return den !== 0 ? num / den : 0;
  }
  return parseFloat(s) || 0;
}

function toolBtn(active: boolean): React.CSSProperties {
  return {
    padding: "5px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    border: active ? "1px solid rgba(168,85,247,0.6)" : "1px solid rgba(100,116,139,0.4)",
    background: active ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.03)",
    color: active ? "#c084fc" : "#94a3b8",
    cursor: "pointer",
  };
}
