"use client";

import { useEffect } from "react";

const message =
  "Leave without saving the bulk credentials? Download or copy them first. You can still show passwords individually from the roster, but this bulk view will be lost.";

/** Passwords stay in memory; leaving the contest must be an explicit choice. */
export function useUnsavedCredentials(unsaved: boolean) {
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);

    let leaving = false;
    let approvedDestination = "";
    let rearm: ReturnType<typeof setTimeout> | undefined;
    const guardedPath = location.pathname;
    const approve = (destination: string) => {
      approvedDestination = destination;
      leaving = true;
      window.removeEventListener("beforeunload", warn);
      // A refused or aborted link must not disable the next reload warning.
      rearm = setTimeout(() => {
        if (location.pathname === guardedPath) {
          leaving = false;
          window.addEventListener("beforeunload", warn);
        }
      }, 0);
    };
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (
        !link ||
        link.download ||
        link.target === "_blank" ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const destination = new URL(link.href);
      if (
        destination.pathname === location.pathname &&
        destination.search === location.search &&
        destination.origin === location.origin
      )
        return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else {
        approve(destination.href);
      }
    };
    document.addEventListener("click", click, true);

    // Navigation events cover browser history as well as client-side links.
    const navigation = (
      window as Window & {
        navigation?: EventTarget;
      }
    ).navigation;
    const navigate = (event: Event) => {
      const destination = new URL(
        (event as Event & { destination: { url: string } }).destination.url,
      );
      if (
        destination.origin === location.origin &&
        destination.pathname === location.pathname &&
        destination.search === location.search
      )
        return;
      const traversal =
        (event as Event & { navigationType?: string }).navigationType ===
        "traverse";
      if (traversal) approvedDestination = "";
      if (!traversal && approvedDestination === destination.href) {
        approvedDestination = "";
        return;
      }
      if (event.cancelable) {
        if (!window.confirm(message)) event.preventDefault();
        else {
          approve(destination.href);
          approvedDestination = "";
        }
      }
    };
    if (navigation) {
      navigation.addEventListener("navigate", navigate);
      return () => {
        clearTimeout(rearm);
        window.removeEventListener("beforeunload", warn);
        navigation.removeEventListener("navigate", navigate);
        document.removeEventListener("click", click, true);
      };
    }

    // Older browsers need a same-URL history entry to catch Back before React
    // unmounts this screen. Capture popstate before the router handles it.
    // shortcut: arming clears legacy Forward history; remove this fallback when all supported browsers provide Navigation API.
    let restoring = false;
    const marker = crypto.randomUUID();
    const predecessor = {
      ...history.state,
      credentialGuard: marker,
      guardEntry: false,
    };
    history.replaceState(predecessor, "", location.href);
    history.pushState({ ...predecessor, guardEntry: true }, "", location.href);
    const pop = (notification: Event) => {
      const event = (notification as CustomEvent<PopStateEvent>).detail;
      event.stopImmediatePropagation();
      if (restoring) {
        if (event.state?.credentialGuard === marker && event.state.guardEntry) {
          restoring = false;
        } else {
          history.forward();
        }
        return;
      }
      if (window.confirm(message)) {
        leaving = true;
        window.removeEventListener("ams:before-history", pop);
        window.removeEventListener("beforeunload", warn);
        if (
          event.state?.credentialGuard === marker &&
          !event.state.guardEntry
        ) {
          history.back();
        } else {
          window.dispatchEvent(
            new PopStateEvent("popstate", { state: event.state }),
          );
        }
      } else {
        restoring = true;
        history.forward();
      }
    };
    window.addEventListener("ams:before-history", pop);
    return () => {
      clearTimeout(rearm);
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("ams:before-history", pop);
      document.removeEventListener("click", click, true);
      if (!leaving && location.pathname === guardedPath) {
        // Remove the guard entry without asking the router to navigate.
        const currentUrl = location.href;
        window.addEventListener(
          "ams:before-history",
          (event) => {
            (
              event as CustomEvent<PopStateEvent>
            ).detail.stopImmediatePropagation();
            history.replaceState(history.state, "", currentUrl);
          },
          { once: true },
        );
        history.back();
      }
    };
  }, [unsaved]);
}
