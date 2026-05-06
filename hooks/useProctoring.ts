"use client";

import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { EventType } from "@/lib/types";

type Metadata = Record<string, unknown>;

type UseProctoringOptions = {
  sessionId?: string;
  enabled?: boolean;
};

// Browser proctoring is not foolproof. This logs integrity signals for manual review;
// it does not guarantee cheating prevention or prove misconduct.
export function useProctoring({ sessionId, enabled = true }: UseProctoringOptions) {
  // Throttle refs — prevent flooding the DB with repeated identical events
  const lastDevtoolsLogAt   = useRef(0);
  const lastMouseLeaveAt    = useRef(0);
  const lastFullscreenState = useRef<boolean | null>(null);
  const idleTimer           = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleFiredAt         = useRef<30 | 60 | 120 | null>(null);

  // Typing velocity: track keystroke timestamps in a 10-second rolling window
  const keystrokeTimestamps = useRef<number[]>([]);
  const lastTypingSpikeAt   = useRef(0);

  // Answer spike: track total char length per question between save cycles
  const prevDraftLengths    = useRef<Record<string, number>>({});
  const lastAnswerSpikeAt   = useRef(0);

  // ─── Core log function ───────────────────────────────────────────────────
  const logEvent = useCallback(
    async (eventType: EventType, metadata: Metadata = {}) => {
      if (!sessionId || !enabled) return;

      const payload = {
        session_id: sessionId,
        event_type: eventType,
        user_agent: navigator.userAgent,
        metadata: {
          ...metadata,
          url: window.location.href,
          ts: Date.now(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight,
          },
        },
      };

      await supabase.from("proctor_events").insert(payload);
    },
    [enabled, sessionId]
  );

  useEffect(() => {
    if (!sessionId || !enabled) return;

    // ── 1. FULLSCREEN ────────────────────────────────────────────────────
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      if (lastFullscreenState.current === isFullscreen) return;
      lastFullscreenState.current = isFullscreen;
      void logEvent(isFullscreen ? "FULLSCREEN_ENTER" : "FULLSCREEN_EXIT", {
        fullscreenElement: document.fullscreenElement?.nodeName ?? null,
      });
    };

    // ── 2. TAB VISIBILITY ────────────────────────────────────────────────
    // Fires when user Alt+Tabs, opens a new tab, or minimises the window.
    const handleVisibilityChange = () => {
      void logEvent(document.hidden ? "TAB_HIDDEN" : "TAB_VISIBLE", {
        visibilityState: document.visibilityState,
      });
    };

    // ── 3. WINDOW FOCUS/BLUR ─────────────────────────────────────────────
    // Fires when cursor moves to another app (terminal, notes, etc.)
    const handleBlur  = () => void logEvent("WINDOW_BLUR");
    const handleFocus = () => void logEvent("WINDOW_FOCUS");

    // ── 4. CLIPBOARD — BLOCKED & LOGGED ─────────────────────────────────
    // Copy and cut are blocked entirely (prevents stealing question content).
    // Paste is also blocked (prevents pasting AI-generated answers).
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      const text = window.getSelection()?.toString() ?? "";
      void logEvent("COPY", { blocked: true, selectionLength: text.length, preview: text.slice(0, 80) });
    };
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      const text = window.getSelection()?.toString() ?? "";
      void logEvent("CUT", { blocked: true, selectionLength: text.length });
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      void logEvent("PASTE", { blocked: true });
    };

    // ── 5. CONTEXT MENU SUPPRESSION ──────────────────────────────────────
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      void logEvent("CONTEXT_MENU", { x: e.clientX, y: e.clientY });
    };

    // ── 6. KEYBOARD SHORTCUT INTERCEPTION + TYPING VELOCITY ─────────────
    // Blocks DevTools/print/clipboard shortcuts. Also measures chars-per-minute
    // via a 10-second rolling window. CPM > 600 is ~3× average typist speed.
    const CPM_THRESHOLD    = 600;
    const VELOCITY_WINDOW  = 10_000; // ms

    const handleKeydown = (e: KeyboardEvent) => {
      const isDevTools =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.metaKey && e.altKey && e.key === "I");
      const isViewSource = (e.ctrlKey || e.metaKey) && e.key === "u";
      const isPrint      = (e.ctrlKey || e.metaKey) && e.key === "p";
      const isCopy  = (e.ctrlKey || e.metaKey) && e.key === "c";
      const isCut   = (e.ctrlKey || e.metaKey) && e.key === "x";
      const isPaste = (e.ctrlKey || e.metaKey) && e.key === "v";

      if (isDevTools || isViewSource || isPrint || isCopy || isCut || isPaste) {
        e.preventDefault();
        e.stopPropagation();
        const reason = isDevTools ? "devtools" : isViewSource ? "view_source" : isPrint ? "print"
          : isCopy ? "copy" : isCut ? "cut" : "paste";
        void logEvent("KEYBOARD_SHORTCUT_BLOCKED", {
          key: e.key, ctrl: e.ctrlKey, shift: e.shiftKey, meta: e.metaKey, reason,
        });
        return;
      }

      // Track printable keystrokes for CPM rolling window
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
        const now = Date.now();
        keystrokeTimestamps.current.push(now);
        keystrokeTimestamps.current = keystrokeTimestamps.current.filter(
          (t) => now - t <= VELOCITY_WINDOW
        );
        const cpm = (keystrokeTimestamps.current.length / (VELOCITY_WINDOW / 1000)) * 60;
        if (cpm > CPM_THRESHOLD && now - lastTypingSpikeAt.current > 20_000) {
          lastTypingSpikeAt.current = now;
          void logEvent("TYPING_SPIKE", { cpm: Math.round(cpm), threshold: CPM_THRESHOLD });
        }
      }
    };


    // ── 7. DEVTOOLS HEURISTIC (window size delta) ────────────────────────
    // DevTools docked to the side/bottom adds a measurable gap between
    // outerWidth/outerHeight and innerWidth/innerHeight.
    const handleResize = () => {
      const widthGap  = Math.abs(window.outerWidth  - window.innerWidth);
      const heightGap = Math.abs(window.outerHeight - window.innerHeight);
      const now = Date.now();
      if ((widthGap > 180 || heightGap > 220) && now - lastDevtoolsLogAt.current > 15_000) {
        lastDevtoolsLogAt.current = now;
        void logEvent("DEVTOOLS_SUSPECTED", { widthGap, heightGap });
      }
    };

    // ── 8. MOUSE LEAVE DETECTION ─────────────────────────────────────────
    // Fires when the cursor moves to the browser chrome (address bar,
    // bookmarks, another monitor, etc.)
    const handleMouseLeave = () => {
      const now = Date.now();
      // Throttle to at most once per 5 seconds to avoid noise
      if (now - lastMouseLeaveAt.current < 5_000) return;
      lastMouseLeaveAt.current = now;
      void logEvent("MOUSE_LEFT_WINDOW");
    };
    const handleMouseEnter = () => void logEvent("MOUSE_RETURNED");

    // ── 9. IDLE DETECTION ────────────────────────────────────────────────
    // No keyboard/mouse activity for 30s, 60s, 120s escalating signals.
    const resetIdleTimer = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleFiredAt.current = null;

      const schedule = (seconds: 30 | 60 | 120) => {
        idleTimer.current = setTimeout(() => {
          if (idleFiredAt.current === seconds) return;
          idleFiredAt.current = seconds;
          void logEvent(`IDLE_${seconds}S` as EventType, { idleSeconds: seconds });
          if (seconds < 120) schedule(seconds === 30 ? 60 : 120);
        }, seconds * 1_000);
      };
      schedule(30);
    };
    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((evt) => document.addEventListener(evt, resetIdleTimer, { passive: true }));
    resetIdleTimer(); // start the first timer immediately

    // ── 10. NETWORK OFFLINE/ONLINE ───────────────────────────────────────
    const handleOffline = () => void logEvent("NETWORK_OFFLINE");
    const handleOnline  = () => void logEvent("NETWORK_ONLINE");

    // ── 11. PRINT ATTEMPT ────────────────────────────────────────────────
    const handleBeforePrint = () => void logEvent("PRINT_ATTEMPT");

    // ─── Register all listeners ──────────────────────────────────────────
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy",            handleCopy);
    document.addEventListener("cut",             handleCut);
    document.addEventListener("paste",           handlePaste);
    document.addEventListener("contextmenu",     handleContextMenu);
    document.addEventListener("keydown",         handleKeydown, { capture: true });
    document.addEventListener("mouseleave",      handleMouseLeave);
    document.addEventListener("mouseenter",      handleMouseEnter);
    window.addEventListener("blur",              handleBlur);
    window.addEventListener("focus",             handleFocus);
    window.addEventListener("resize",            handleResize);
    window.addEventListener("offline",           handleOffline);
    window.addEventListener("online",            handleOnline);
    window.addEventListener("beforeprint",       handleBeforePrint);

    // Log initial fullscreen state
    handleFullscreenChange();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy",            handleCopy);
      document.removeEventListener("cut",             handleCut);
      document.removeEventListener("paste",           handlePaste);
      document.removeEventListener("contextmenu",     handleContextMenu);
      document.removeEventListener("keydown",         handleKeydown, { capture: true });
      document.removeEventListener("mouseleave",      handleMouseLeave);
      document.removeEventListener("mouseenter",      handleMouseEnter);
      window.removeEventListener("blur",              handleBlur);
      window.removeEventListener("focus",             handleFocus);
      window.removeEventListener("resize",            handleResize);
      window.removeEventListener("offline",           handleOffline);
      window.removeEventListener("online",            handleOnline);
      window.removeEventListener("beforeprint",       handleBeforePrint);
      activityEvents.forEach((evt) => document.removeEventListener(evt, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [enabled, logEvent, sessionId]);

  // ── reportDrafts ─────────────────────────────────────────────────────────
  // Called by the assessment page on every draft change.
  // Detects sudden large answer length jumps between save cycles —
  // the most reliable workaround signal when clipboard is blocked.
  const reportDrafts = useCallback(
    (drafts: Record<string, { answerText: string; finalAnswer: string }>) => {
      if (!sessionId || !enabled) return;

      const now = Date.now();
      // Only run the check at most once every 15 seconds to avoid noise
      if (now - lastAnswerSpikeAt.current < 15_000) {
        prevDraftLengths.current = Object.fromEntries(
          Object.entries(drafts).map(([k, v]) => [k, (v.answerText?.length ?? 0) + (v.finalAnswer?.length ?? 0)])
        );
        return;
      }

      for (const [questionId, draft] of Object.entries(drafts)) {
        const currentLen = (draft.answerText?.length ?? 0) + (draft.finalAnswer?.length ?? 0);
        const prevLen    = prevDraftLengths.current[questionId] ?? 0;
        const delta      = currentLen - prevLen;

        // Flag if answer grew by >300 chars since last check in a 15-second window
        // (300 chars ~= ~60wpm for 5 seconds, well above normal sustained typing)
        if (delta > 300 && prevLen < currentLen) {
          lastAnswerSpikeAt.current = now;
          void logEvent("ANSWER_SPIKE", {
            questionId,
            previousLength: prevLen,
            currentLength: currentLen,
            delta,
          });
          break; // one spike event per check cycle is enough
        }
      }

      prevDraftLengths.current = Object.fromEntries(
        Object.entries(drafts).map(([k, v]) => [k, (v.answerText?.length ?? 0) + (v.finalAnswer?.length ?? 0)])
      );
    },
    [enabled, logEvent, sessionId]
  );

  return { logEvent, reportDrafts };
}
