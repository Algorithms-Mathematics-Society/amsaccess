"use client";

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
  isPractice: boolean,
  isDraft = false
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
    // Draft contests are the trap here. They are excluded from the fleet's
    // demand entirely — nobody can join one, so warming for it would be
    // paying for an empty hall — but the old wording promised judges would
    // turn up anyway, which is exactly the sentence an organiser reads at
    // T-60 and relaxes at.
    if (isDraft) {
      return {
        tone: "warn",
        headline: "No judges while this is a draft",
        detail:
          "Judges are warmed for published contests only. Publish it and they start an hour before it opens.",
      };
    }
    return {
      tone: "idle",
      headline: "No judges held for this contest",
      detail:
        "Judges start on their own an hour before the contest opens. Until then submissions go to the always-on judge.",
    };
  }

  const judges = mine.instances;
  const roster = mine.participants;
  // "4 judges" means something different when a person typed it: the roster
  // no longer explains the number, so saying where it came from is the only
  // way the strip stays self-explanatory.
  const plural = judges === 1 ? "" : "s";
  // Say which of the three numbers produced this one. "Expected" matters
  // most: it is the case where the roster is still empty, so a reader who
  // assumes the roster is the source would read 30 judges as 30 people.
  const because =
    mine.source === "pinned" || mine.pinned
      ? `${judges} judges set for this contest`
      : mine.source === "expected"
        ? `${mine.participants.toLocaleString()} on the roster so far, ${judges} judge${plural} for the expected turnout`
        : `${roster.toLocaleString()} on the roster \u2192 ${judges} judge${plural}`;
  // `live` is platform-wide: the fleet is shared, so it is the honest number
  // for "how many are answering", even though the contest asked for `judges`.
  const up = Math.min(fleet.live, judges);
  const ready = up >= judges;

  return {
    tone: ready ? "good" : "warn",
    headline: because,
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
  fleet,
  contestUid,
  isPractice,
  isDraft = false,
}: {
  fleet: Fleet | null;
  contestUid: string;
  isPractice: boolean;
  isDraft?: boolean;
}) {
  const scale = scaleOf(fleet, contestUid, isPractice, isDraft);
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
