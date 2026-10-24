"use client";

import { useState } from "react";
import { ContestScale } from "./ContestScale";
import { FleetPanel, type Fleet } from "./FleetPanel";

/** Both judging views use the same live read, including post-action refreshes. */
export function ContestJudging(props: {
  contestUid: string;
  isPractice: boolean;
  isDraft: boolean;
}) {
  const [fleet, setFleet] = useState<Fleet | null>(null);
  return (
    <div className="space-y-4">
      <ContestScale {...props} fleet={fleet} />
      <FleetPanel onFleetChange={setFleet} />
    </div>
  );
}
