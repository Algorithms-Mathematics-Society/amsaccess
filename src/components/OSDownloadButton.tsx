"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Monitor } from "lucide-react";
import { PlatformLogo } from "@/components/PlatformLogo";

type OS = "Windows" | "macOS" | "Linux";

function detectOS(): OS | null {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const value = `${nav.userAgentData?.platform ?? ""} ${navigator.platform} ${navigator.userAgent}`.toLowerCase();
  if (value.includes("mac")) return "macOS";
  if (value.includes("win")) return "Windows";
  if (value.includes("linux") || value.includes("x11")) return "Linux";
  return null;
}

export function OSDownloadButton({ large = false }: { large?: boolean }) {
  const [os, setOS] = useState<OS | null>(null);
  useEffect(() => setOS(detectOS()), []);
  const label = os ? `Download for ${os}` : "Choose your download";

  return (
    <Link href="/download" className={`group inline-flex max-w-full items-stretch overflow-hidden rounded-control bg-violet font-body font-semibold text-white no-underline shadow-sm transition-all hover:bg-violet-deep active:translate-y-px ${large ? "min-h-14 w-full text-sm sm:min-h-16 sm:w-auto sm:text-base" : "min-h-11 text-sm"}`}>
      <span className={`flex shrink-0 items-center justify-center border-r border-white/20 bg-white/10 ${large ? "w-14 sm:w-16" : "w-12"}`}>
        {os ? <PlatformLogo platform={os} className={large ? "h-6 w-6" : "h-5 w-5"} /> : <Monitor className={large ? "h-6 w-6" : "h-5 w-5"} />}
      </span>
      <span className={`flex min-w-0 flex-1 items-center justify-between gap-3 ${large ? "px-4 sm:px-6" : "px-4"}`}>
        <span className="whitespace-nowrap">{label}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
