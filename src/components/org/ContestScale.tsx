"use client";

import { useEffect, useState } from "react";
import { Cpu } from "lucide-react";
import type { Fleet, Upcoming } from "./FleetPanel";

/**
 * What scale this contest is being judged at.
 *
 * The Judging page answers this for the platform; a contest page has to answer
 * it for *this* contest, because that is the question an organiser actually
 * has at T-30: is there enough judging behind the round I am about to run.
 *
 * Everything here comes from `GET /fleet`'s `upcoming[]`, which the autoscaler
 * already computes per contest — roster size, how many judges that earns, and
 * why. Deriving it again in the browser would be a second answer that can
 * disagree with the one the fleet is actually acting on.
 */

type Scale = {
  tone: "good" | "warn" | "idle";
  headline: string;
  detail: string;
};

/** Judges wanted for this contest, and how many are answering. */
export function scaleOf(
  fleet: Fleet | null,
  contestUid: string,
  isPractice: boolean
): Scale | null {
  if (!fleet) return null;

  if (isPractice) {
    return {
      tone: "idle",
      headline: "Judged by the always-on judge",
      detail:
        "Practice contests never start the fleet — their window is open indefinitely, so warming for one would mean paying for judges that are never idle.",
    };
  }

  const mine: Upcoming | undefined = fleet.upcoming.find((u) => u.contest_uid === contestUid);

  if (!mine) {
    return {
      tone: "idle",
      headline: "No judges held for this contest",
      detail:
        "Judges start on their own about half an hour before the contest opens. Until then submissions go to the always-on judge.",
    };
  }

  const judges = mine.instances;
  const roster = mine.participants;
  // `live` is platform-wide: the fleet is shared, so it is the honest number
  // for "how many are answering", even though the contest asked for `judges`.
  const up = Math.min(fleet.live, judges);
  const ready = up >= judges;

  return {
    tone: ready ? "good" : "warn",
    headline: `${roster.toLocaleString()} on the roster → ${judges} judge${judges === 1 ? "" : "s"}`,
    detail: ready
      ? `All ${judges} running. ${mine.reason === "running" ? "Judging now." : "Ready before the start."}`
      : `${up} of ${judges} running — the rest take about 90 seconds from launch.`,
  };
}

const TONE: Record<Scale["tone"], string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  idle: "border-slate-200 bg-slate-50 text-slate-700",
};

export function ContestScale({
  contestUid,
  isPractice,
}: {
  contestUid: string;
  isPractice: boolean;
}) {
  const [fleet, setFleet] = useState<Fleet | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/org/fleet", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Fleet;
        if (!cancelled) setFleet(data);
      } catch {
        // A contest page must not break because the fleet view is unreachable.
        // Showing nothing is correct here: this strip is context, not control.
      }
    };
    void load();
    const t = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const scale = scaleOf(fleet, contestUid, isPractice);
  if (!scale) return null;

  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs ${TONE[scale.tone]}`}>
      <Cpu className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 opacity-70" />
      <span className="min-w-0">
        <span className="font-medium">{scale.headline}</span>
        <span className="opacity-80">{" · "}{scale.detail}</span>
      </span>
    </div>
  );
}
