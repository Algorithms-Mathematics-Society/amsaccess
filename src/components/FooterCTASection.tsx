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
            className="ams-btn ams-btn-inverse ams-btn-lg"
          >
            Download
          </Link>
        </div>
      </div>
    </DarkSection>
  );
}
