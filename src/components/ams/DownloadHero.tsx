"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

/**
 * The primary download control, which picks the visitor's platform for them.
 *
 * Every real download page does this, and the reason is that three equal
 * cards make a visitor answer a question the browser already knows the
 * answer to. The other platforms stay listed below, because the guess is
 * sometimes wrong and because people download for a machine they are not
 * sitting at.
 *
 * Renders a neutral label until mounted. userAgent is not available during
 * the server render, and guessing produces a button that says Windows to a
 * Mac user for one frame.
 */

type Platform = "windows" | "macos" | "linux";

const LABEL: Record<Platform, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

function detect(): Platform | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  if (ua.includes("linux") || ua.includes("x11")) return "linux";
  return null;
}

export function PrimaryDownload({
  available,
  version,
}: {
  /** Which platforms actually have a build in this release. */
  available: Record<Platform, string | null>;
  version: string | null;
}) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPlatform(detect());
    setMounted(true);
  }, []);

  const href = platform ? available[platform] : null;

  if (!mounted) {
    // Reserves the same box so the heading below does not jump when the
    // real label arrives.
    return <div className="h-11 w-56 rounded-control bg-ink/5" aria-hidden />;
  }

  if (!platform || !href) {
    return (
      <p className="font-body text-sm text-ink/60">
        Pick your platform below.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={href}
        className="inline-flex min-h-11 items-center gap-2 rounded-control bg-burgundy px-5 py-2.5 font-body text-sm font-semibold text-cream-light no-underline transition-colors hover:bg-burgundy-deep"
      >
        <Download className="h-4 w-4" />
        Download for {LABEL[platform]}
      </a>
      {version && (
        <span className="font-mono text-xs text-ink/50">
          {version}
        </span>
      )}
    </div>
  );
}
