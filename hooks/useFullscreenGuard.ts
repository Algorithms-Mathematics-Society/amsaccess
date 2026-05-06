"use client";

import { useCallback, useEffect, useState } from "react";

export function useFullscreenGuard() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [autoAttempted, setAutoAttempted] = useState(false);

  const enterFullscreen = useCallback(async () => {
    setFullscreenError(null);
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
    } catch {
      setFullscreenError("Fullscreen permission was blocked by the browser. Click the button to try again.");
    }
  }, []);

  // Auto-attempt fullscreen on mount — browsers allow this when the page
  // was opened via a direct user gesture (e.g. clicking "Start assessment").
  useEffect(() => {
    if (autoAttempted) return;
    setAutoAttempted(true);
    void enterFullscreen();
  }, [autoAttempted, enterFullscreen]);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  return {
    isFullscreen,
    fullscreenError,
    enterFullscreen,
  };
}
