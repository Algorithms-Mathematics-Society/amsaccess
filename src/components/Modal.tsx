"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog primitive.
 *
 * Handles the things the ad-hoc overlays in this app were missing: Escape to
 * close, a focus trap, focus restoration to the trigger on close, backdrop-click
 * close, body scroll lock, and the `role="dialog"`/`aria-modal` semantics.
 *
 * It only renders the overlay + card shell — callers supply the full inner
 * content (header + body) as children, so existing layouts carry over unchanged.
 * Pass `labelledBy`/`describedBy` with the ids of the title/description nodes
 * inside `children` so assistive tech announces the dialog correctly.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  describedBy,
  cardClassName = "max-w-lg",
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  describedBy?: string;
  /** Extra classes for the card (typically a max-width). */
  cardClassName?: string;
  children: React.ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while open; restore on close/unmount.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Move focus into the dialog on open; return it to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Prefer the first focusable control; fall back to the card itself.
    const first = cardRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? cardRef.current)?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const card = cardRef.current;
    if (!card) return;
    const nodes = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (n) => n.offsetParent !== null || n === document.activeElement
    );
    if (nodes.length === 0) {
      // Nothing focusable — keep focus on the card so Tab can't escape.
      e.preventDefault();
      card.focus();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className={`flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl focus:outline-none ${cardClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
