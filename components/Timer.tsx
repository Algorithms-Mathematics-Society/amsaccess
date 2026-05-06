"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type TimerProps = {
  startedAt: string;
  durationMinutes: number;
  onExpire?: () => void;
};

function formatTime(ms: number) {
  const safeMs = Math.max(ms, 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function Timer({ startedAt, durationMinutes, onExpire }: TimerProps) {
  const endAt = useMemo(
    () => new Date(startedAt).getTime() + durationMinutes * 60 * 1000,
    [durationMinutes, startedAt]
  );
  const [remainingMs, setRemainingMs] = useState(endAt - Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = endAt - Date.now();
      setRemainingMs(next);
      if (next <= 0) {
        window.clearInterval(id);
        onExpire?.();
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [endAt, onExpire]);

  const isLow = remainingMs <= 5 * 60 * 1000;

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-mono text-sm tabular-nums tracking-widest ${
        isLow ? "text-red-400" : "text-white/50"
      }`}
    >
      <Clock3 className={`h-3.5 w-3.5 ${isLow ? "text-red-400" : "text-white/30"}`} />
      {formatTime(remainingMs)}
    </div>
  );
}
