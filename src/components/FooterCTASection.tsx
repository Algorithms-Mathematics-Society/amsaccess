"use client";

import Link from "next/link";
import { DarkSection } from "./DarkSection";

export function FooterCTASection() {
  return (
    <DarkSection className="py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="mb-2 text-4xl font-medium tracking-tight md:text-5xl">
            Download AMS
          </h2>
          <h2 className="mb-10 flex flex-wrap items-center gap-x-3 text-4xl font-medium tracking-tight md:text-5xl">
            Access for your platform
            <span className="inline-block h-10 w-[3px] animate-pulse bg-gradient-to-b from-violet-300 via-purple-500 to-purple-900" />
          </h2>
          <Link
            href="/download"
            className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-medium text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-transform hover:scale-105"
          >
            Download
          </Link>
        </div>
      </div>
    </DarkSection>
  );
}
