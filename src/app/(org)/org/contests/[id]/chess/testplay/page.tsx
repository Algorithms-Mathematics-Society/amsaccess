"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/client/apiClient";
import type { ApiClientError } from "@/lib/client/apiClient";

type Ruleset = {
  id: string;
  name: string;
  version: number;
  ruleset_hash: string;
  is_active: boolean;
};

type MoveRow = {
  id: number;
  actor: string;
  payload: string;
  legal: boolean;
  created_at: string;
};

type TestplayState = {
  match_id: string;
  turn: number;
  state_hash: string;
  state_json: Record<string, unknown>;
  moves: MoveRow[];
};

type BoardPiece = {
  square: string;
  color: "white" | "black";
  role: string;
};

const defaultYaml = `board:\n  width: 8\n  height: 8\npieces:\n  - id: king\n    color: white\n  - id: king\n    color: black\n`;

function getYamlBoardSize(yaml: string): { width: number; height: number } {
  const w = Number((yaml.match(/\bwidth:\s*(\d+)/i) ?? ["", "8"])[1]);
  const h = Number((yaml.match(/\bheight:\s*(\d+)/i) ?? ["", "8"])[1]);
  return {
    width: Number.isFinite(w) && w > 0 ? Math.min(20, w) : 8,
    height: Number.isFinite(h) && h > 0 ? Math.min(20, h) : 8,
  };
}

function normalizeSquare(v: unknown, width: number, height: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (!/^[a-z]+\d+$/.test(s)) return null;
  const file = s.match(/^[a-z]+/)?.[0] ?? "a";
  const rank = Number(s.match(/\d+$/)?.[0] ?? "0");
  if (rank < 1 || rank > height) return null;
  const fileIdx = file.charCodeAt(0) - 97;
  if (fileIdx < 0 || fileIdx >= width) return null;
  return `${String.fromCharCode(97 + fileIdx)}${rank}`;
}

function xyToSquare(x: number, y: number, width: number, height: number): string | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const xi = Math.trunc(x);
  const yi = Math.trunc(y);
  if (xi < 0 || yi < 0 || xi >= width || yi >= height) return null;
  return `${String.fromCharCode(97 + xi)}${yi + 1}`;
}

function parseBoardFromState(state: Record<string, unknown>, yaml: string): { width: number; height: number; pieces: BoardPiece[] } {
  const yamlSize = getYamlBoardSize(yaml);
  const boardObj = (state.board ?? {}) as Record<string, unknown>;
  const width = typeof boardObj.width === "number" ? Math.min(20, Math.max(1, boardObj.width)) : yamlSize.width;
  const height = typeof boardObj.height === "number" ? Math.min(20, Math.max(1, boardObj.height)) : yamlSize.height;

  const listCandidates: unknown[] = [];
  if (Array.isArray(state.pieces)) listCandidates.push(...state.pieces);
  if (Array.isArray(boardObj.pieces)) listCandidates.push(...boardObj.pieces);

  const pieces: BoardPiece[] = [];
  for (const p of listCandidates) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    const role = String(o.type ?? o.id ?? o.piece ?? "piece").toLowerCase();
    const color = String(o.color ?? o.side ?? "white").toLowerCase() === "black" ? "black" : "white";

    const sq1 = normalizeSquare(o.square, width, height);
    const sq2 = normalizeSquare(o.pos, width, height);
    const x = typeof o.x === "number" ? o.x : typeof o.file === "number" ? o.file : NaN;
    const y = typeof o.y === "number" ? o.y : typeof o.rank === "number" ? o.rank - 1 : NaN;
    const sq3 = xyToSquare(x, y, width, height);
    const square = sq1 ?? sq2 ?? sq3;
    if (!square) continue;

    pieces.push({ square, color, role });
  }

  return { width, height, pieces };
}

function pieceGlyph(role: string, color: "white" | "black"): string {
  const r = role.toLowerCase();
  const white: Record<string, string> = { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" };
  const black: Record<string, string> = { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" };
  return (color === "white" ? white[r] : black[r]) ?? (color === "white" ? "●" : "○");
}

export default function ChessTestPlayPage() {
  const { id } = useParams<{ id: string }>();
  const [yaml, setYaml] = useState(defaultYaml);
  const [rulesetName, setRulesetName] = useState("Live Ruleset");
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [selectedRuleset, setSelectedRuleset] = useState<string>("");
  const [validationMsg, setValidationMsg] = useState<string>("");
  const [state, setState] = useState<TestplayState | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string>("");
  const [moveFrom, setMoveFrom] = useState("e2");
  const [moveTo, setMoveTo] = useState("e4");
  const [moveActor, setMoveActor] = useState<"WHITE" | "BLACK">("WHITE");
  const [sinceId, setSinceId] = useState<number>(0);
  const [polling, setPolling] = useState(true);
  const [selectedSquare, setSelectedSquare] = useState<string>("");

  const refreshRulesets = useCallback(async () => {
    try {
      const res = await apiFetch<Ruleset[]>("/api/org/chess/rulesets");
      setRulesets(res);
      if (!selectedRuleset && res.length > 0) setSelectedRuleset(res[0].id);
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Unable to list rulesets.");
    }
  }, [selectedRuleset]);

  async function createRuleset() {
    setLoading(true);
    setLastError("");
    try {
      const created = await apiFetch<{ id: string }>("/api/org/chess/rulesets", {
        method: "POST",
        body: JSON.stringify({ name: rulesetName.trim() || "Live Ruleset", dsl_yaml: yaml })
      });
      await refreshRulesets();
      setSelectedRuleset(created.id);
      setValidationMsg("Ruleset saved.");
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Failed to save ruleset.");
    } finally {
      setLoading(false);
    }
  }

  async function validateSelected() {
    if (!selectedRuleset) return;
    setLoading(true);
    setLastError("");
    try {
      const res = await apiFetch<{ ok: boolean; ruleset_hash: string }>(`/api/org/chess/rulesets/${selectedRuleset}/validate`, {
        method: "POST"
      });
      setValidationMsg(`Ruleset valid. hash=${res.ruleset_hash.slice(0, 12)}...`);
    } catch (e) {
      setValidationMsg("");
      setLastError(e instanceof Error ? e.message : "Ruleset invalid.");
    } finally {
      setLoading(false);
    }
  }

  async function startSession() {
    if (!selectedRuleset) return;
    setLoading(true);
    setLastError("");
    try {
      await apiFetch(`/api/org/contests/${id}/chess/testplay/session`, {
        method: "POST",
        body: JSON.stringify({ mode: "PVE", ruleset_id: selectedRuleset })
      });
      await refreshState();
      setValidationMsg("Test session started.");
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Failed to start session.");
    } finally {
      setLoading(false);
    }
  }

  const refreshState = useCallback(async () => {
    try {
      const s = await apiFetch<TestplayState>(`/api/org/contests/${id}/chess/testplay/state`);
      setState(s);
      if (s.moves.length > 0) setSinceId(s.moves[s.moves.length - 1].id);
    } catch {
      // no active session yet
    }
  }, [id]);

  async function sendMove(fromArg?: string, toArg?: string) {
    if (!state) return;
    const from = (fromArg ?? moveFrom).toLowerCase();
    const to = (toArg ?? moveTo).toLowerCase();
    setLoading(true);
    setLastError("");
    try {
      await apiFetch(`/api/org/contests/${id}/chess/testplay/move`, {
        method: "POST",
        body: JSON.stringify({ match_id: state.match_id, actor: moveActor, move: { from, to } })
      });
      setMoveFrom(from);
      setMoveTo(to);
      setSelectedSquare("");
      await refreshState();
    } catch (e) {
      const err = e as ApiClientError;
      setLastError(err.message || "Move failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshRulesets();
    void refreshState();
  }, [refreshRulesets, refreshState]);

  useEffect(() => {
    if (!polling || !state) return;
    const interval = setInterval(async () => {
      try {
        await apiFetch(`/api/org/contests/${id}/chess/testplay/events?since_id=${sinceId}`);
        await refreshState();
      } catch {
        // keep polling but avoid UI noise
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [id, sinceId, state, polling, refreshState]);

  const parsedBoard = useMemo(() => parseBoardFromState(state?.state_json ?? {}, yaml), [state?.state_json, yaml]);
  const pieceBySquare = useMemo(() => {
    const m = new Map<string, BoardPiece>();
    for (const p of parsedBoard.pieces) m.set(p.square, p);
    return m;
  }, [parsedBoard.pieces]);

  const squares = useMemo(() => {
    const out: string[] = [];
    for (let y = parsedBoard.height; y >= 1; y -= 1) {
      for (let x = 0; x < parsedBoard.width; x += 1) out.push(`${String.fromCharCode(97 + x)}${y}`);
    }
    return out;
  }, [parsedBoard.height, parsedBoard.width]);

  const prettyState = useMemo(() => JSON.stringify(state?.state_json ?? {}, null, 2), [state]);

  function onSquareClick(square: string) {
    if (!state) return;
    if (!selectedSquare) {
      if (!pieceBySquare.get(square)) return;
      setSelectedSquare(square);
      setMoveFrom(square);
      return;
    }
    if (selectedSquare === square) {
      setSelectedSquare("");
      return;
    }
    setMoveTo(square);
    void sendMove(selectedSquare, square);
  }

  return (
    <div className="space-y-4 p-6 text-white">
      <h1 className="text-2xl font-semibold">Chess Test Play</h1>
      <p className="text-sm text-zinc-400">Build ruleset YAML, validate it, start a session, and play moves on board.</p>

      {lastError ? <div className="rounded border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{lastError}</div> : null}
      {validationMsg ? <div className="rounded border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{validationMsg}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <h2 className="text-sm font-semibold">Ruleset YAML</h2>
          <input value={rulesetName} onChange={(e) => setRulesetName(e.target.value)} placeholder="Ruleset name" className="w-full rounded border border-white/10 bg-black/50 p-2 text-xs" />
          <textarea value={yaml} onChange={(e) => setYaml(e.target.value)} rows={16} className="w-full rounded border border-white/10 bg-black/50 p-3 font-mono text-xs" />
          <div className="flex gap-2">
            <button onClick={() => void createRuleset()} disabled={loading} className="rounded bg-purple-600 px-3 py-2 text-xs font-semibold">Save ruleset</button>
            <button onClick={() => void validateSelected()} disabled={!selectedRuleset || loading} className="rounded border border-white/20 px-3 py-2 text-xs font-semibold">Validate selected</button>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <h2 className="text-sm font-semibold">Session + Board</h2>
          <select value={selectedRuleset} onChange={(e) => setSelectedRuleset(e.target.value)} className="w-full rounded border border-white/10 bg-black/50 p-2 text-xs">
            <option value="">Select ruleset</option>
            {rulesets.map((r) => <option key={r.id} value={r.id}>{r.name} v{r.version}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void startSession()} disabled={!selectedRuleset || loading} className="rounded bg-emerald-600 px-3 py-2 text-xs font-semibold">Start session</button>
            <button onClick={() => void refreshState()} className="rounded border border-white/20 px-3 py-2 text-xs font-semibold">Refresh state</button>
            <button onClick={() => setPolling((v) => !v)} className="rounded border border-white/20 px-3 py-2 text-xs font-semibold">{polling ? "Stop polling" : "Resume polling"}</button>
            <select value={moveActor} onChange={(e) => setMoveActor(e.target.value as "WHITE" | "BLACK")} className="rounded border border-white/10 bg-black/40 p-2 text-xs">
              <option value="WHITE">WHITE</option>
              <option value="BLACK">BLACK</option>
            </select>
          </div>

          <div className="rounded border border-white/10 bg-black/40 p-3 text-xs">
            <p><span className="text-zinc-400">Match:</span> {state?.match_id ?? "--"}</p>
            <p><span className="text-zinc-400">Turn:</span> {state?.turn ?? "--"}</p>
            <p><span className="text-zinc-400">State hash:</span> {state?.state_hash ?? "--"}</p>
            <p><span className="text-zinc-400">Board:</span> {parsedBoard.width}x{parsedBoard.height}</p>
            <p><span className="text-zinc-400">Selected:</span> {selectedSquare || "none"}</p>
            <p><span className="text-zinc-400">Move:</span> {moveFrom} → {moveTo}</p>
          </div>

          <div className="rounded border border-white/10 bg-black/40 p-2">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${parsedBoard.width}, minmax(0, 1fr))` }}
            >
              {squares.map((sq, idx) => {
                const piece = pieceBySquare.get(sq);
                const x = idx % parsedBoard.width;
                const y = Math.floor(idx / parsedBoard.width);
                const isDark = (x + y) % 2 === 1;
                const isSelected = selectedSquare === sq;
                return (
                  <button
                    key={sq}
                    type="button"
                    onClick={() => onSquareClick(sq)}
                    className="aspect-square rounded text-lg font-semibold transition"
                    style={{
                      background: isSelected
                        ? "rgba(168,85,247,0.45)"
                        : isDark
                        ? "rgba(39,39,42,0.95)"
                        : "rgba(63,63,70,0.95)",
                      border: piece ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.08)",
                      color: piece?.color === "white" ? "#f4f4f5" : "#18181b",
                      textShadow: piece?.color === "black" ? "0 0 1px #fff" : "0 0 1px #000",
                    }}
                    title={sq}
                  >
                    {piece ? pieceGlyph(piece.role, piece.color) : ""}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <h3 className="mb-2 text-sm font-semibold">State JSON</h3>
          <pre className="max-h-72 overflow-auto rounded border border-white/10 bg-black/40 p-3 text-xs">{prettyState}</pre>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <h3 className="mb-2 text-sm font-semibold">Move Log</h3>
          <div className="max-h-72 space-y-1 overflow-auto text-xs">
            {(state?.moves ?? []).map((m) => (
              <div key={m.id} className="rounded border border-white/10 bg-black/40 p-2">
                <span className="text-zinc-400">#{m.id}</span> {m.actor} {m.legal ? "OK" : "ILLEGAL"}
                <pre className="mt-1 whitespace-pre-wrap text-[11px] text-zinc-300">{m.payload}</pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
