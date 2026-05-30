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

const defaultYaml = `board:\n  width: 8\n  height: 8\npieces:\n  - id: king\n    color: white\n  - id: king\n    color: black\n`;

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

  const refreshRulesets = useCallback(async () => {
    const res = await apiFetch<Ruleset[]>("/api/org/chess/rulesets");
    setRulesets(res);
    if (!selectedRuleset && res.length > 0) {
      setSelectedRuleset(res[0].id);
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
      const res = await apiFetch<{ ok: boolean; ruleset_hash: string; runtime?: Record<string, unknown> }>(`/api/org/chess/rulesets/${selectedRuleset}/validate`, {
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
      if (s.moves.length > 0) {
        setSinceId(s.moves[s.moves.length - 1].id);
      }
    } catch {
      // no active session yet
    }
  }, [id]);

  async function sendMove() {
    if (!state) return;
    setLoading(true);
    setLastError("");
    try {
      await apiFetch(`/api/org/contests/${id}/chess/testplay/move`, {
        method: "POST",
        body: JSON.stringify({ match_id: state.match_id, actor: moveActor, move: { from: moveFrom, to: moveTo } })
      });
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

  const prettyState = useMemo(() => JSON.stringify(state?.state_json ?? {}, null, 2), [state]);

  return (
    <div className="space-y-4 p-6 text-white">
      <h1 className="text-2xl font-semibold">Chess Test Play</h1>
      <p className="text-sm text-zinc-400">Build ruleset YAML, validate it, start a session, and execute moves.</p>

      {lastError ? (
        <div className="rounded border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{lastError}</div>
      ) : null}
      {validationMsg ? (
        <div className="rounded border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{validationMsg}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <h2 className="text-sm font-semibold">Ruleset YAML</h2>
          <input
            value={rulesetName}
            onChange={(e) => setRulesetName(e.target.value)}
            placeholder="Ruleset name"
            className="w-full rounded border border-white/10 bg-black/50 p-2 text-xs"
          />
          <textarea
            value={yaml}
            onChange={(e) => setYaml(e.target.value)}
            rows={16}
            className="w-full rounded border border-white/10 bg-black/50 p-3 font-mono text-xs"
          />
          <div className="flex gap-2">
            <button onClick={() => void createRuleset()} disabled={loading} className="rounded bg-purple-600 px-3 py-2 text-xs font-semibold">Save ruleset</button>
            <button onClick={() => void validateSelected()} disabled={!selectedRuleset || loading} className="rounded border border-white/20 px-3 py-2 text-xs font-semibold">Validate selected</button>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <h2 className="text-sm font-semibold">Session + Moves</h2>
          <select value={selectedRuleset} onChange={(e) => setSelectedRuleset(e.target.value)} className="w-full rounded border border-white/10 bg-black/50 p-2 text-xs">
            <option value="">Select ruleset</option>
            {rulesets.map((r) => (
              <option key={r.id} value={r.id}>{r.name} v{r.version}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={() => void startSession()} disabled={!selectedRuleset || loading} className="rounded bg-emerald-600 px-3 py-2 text-xs font-semibold">Start session</button>
            <button onClick={() => void refreshState()} className="rounded border border-white/20 px-3 py-2 text-xs font-semibold">Refresh state</button>
            <button onClick={() => setPolling((v) => !v)} className="rounded border border-white/20 px-3 py-2 text-xs font-semibold">{polling ? "Stop polling" : "Resume polling"}</button>
          </div>

          <div className="rounded border border-white/10 bg-black/40 p-3 text-xs">
            <p><span className="text-zinc-400">Match:</span> {state?.match_id ?? "--"}</p>
            <p><span className="text-zinc-400">Turn:</span> {state?.turn ?? "--"}</p>
            <p><span className="text-zinc-400">State hash:</span> {state?.state_hash ?? "--"}</p>
            <p><span className="text-zinc-400">Polling:</span> {polling ? "ON" : "OFF"}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input value={moveFrom} onChange={(e) => setMoveFrom(e.target.value)} className="rounded border border-white/10 bg-black/40 p-2 text-xs" placeholder="from" />
            <input value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="rounded border border-white/10 bg-black/40 p-2 text-xs" placeholder="to" />
            <select value={moveActor} onChange={(e) => setMoveActor(e.target.value as "WHITE" | "BLACK")} className="rounded border border-white/10 bg-black/40 p-2 text-xs">
              <option value="WHITE">WHITE</option>
              <option value="BLACK">BLACK</option>
            </select>
          </div>
          <button onClick={() => void sendMove()} disabled={!state || loading} className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold">Send move</button>
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
