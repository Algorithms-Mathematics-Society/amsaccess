"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, ExternalLink } from "lucide-react";
import { PlatformLogo } from "@/components/PlatformLogo";
import { ProctorNetwork } from "@/components/ProctorNetwork";
import type { ReleaseAsset } from "@/lib/releases";

function fmtBytes(bytes: number) {
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
  return `${(bytes / 1_000).toFixed(0)} KB`;
}

type PlatformName = "Windows" | "macOS" | "Linux";

type DownloadItem = {
  label: string;
  asset: ReleaseAsset;
};

type PlatformConfig = {
  name: PlatformName;
  downloads: DownloadItem[];
  version: string | null;
  releaseUrl: string | null;
  comingSoon?: boolean;
};

interface DownloadPlatformCardsProps {
  platforms: PlatformConfig[];
}

function detectPlatform(): PlatformName | null {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = `${nav.userAgentData?.platform ?? ""} ${navigator.platform ?? ""} ${navigator.userAgent ?? ""}`.toLowerCase();

  if (platform.includes("mac")) return "macOS";
  if (platform.includes("win")) return "Windows";
  if (platform.includes("linux") || platform.includes("x11")) return "Linux";

  return null;
}

function DownloadButton({ asset, label, featured }: { asset: ReleaseAsset; label: string; featured: boolean }) {
  return (
    <a
      href={asset.url}
      className={featured
        ? "group relative z-10 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm shadow-sm backdrop-blur-md transition-all hover:border-purple-300/50 hover:bg-white/15"
        : "group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50/40 hover:shadow-md"
      }
    >
      <span className={featured ? "font-medium text-white" : "font-medium text-slate-800 group-hover:text-slate-900"}>{label}</span>
      <span className={featured ? "flex items-center gap-2 text-xs text-purple-100/70 group-hover:text-white" : "flex items-center gap-2 text-xs text-slate-400 group-hover:text-purple-600"}>
        {fmtBytes(asset.size)}
        <ArrowDownToLine className="h-3.5 w-3.5" />
      </span>
    </a>
  );
}

function PlatformCard({ name, downloads, version, releaseUrl, comingSoon, featured }: PlatformConfig & { featured: boolean }) {
  return (
    <article className={featured
      ? "relative flex min-h-[21.75rem] overflow-hidden rounded-2xl border border-white/10 bg-ams-dark p-6 text-white shadow-2xl shadow-slate-950/20 ring-1 ring-purple-400/30"
      : "flex min-h-[21.75rem] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    }>
      {featured && (
        <>
          <ProctorNetwork nodeCount={22} connectDist={120} mouseRadius={140} />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.24),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_45%)]" />
        </>
      )}

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <PlatformLogo platform={name} className={featured ? "h-5 w-5 text-purple-100" : "h-5 w-5 text-slate-600"} />
              <h2 className={featured ? "text-xl font-semibold tracking-tight text-white" : "text-xl font-semibold tracking-tight text-slate-900"}>{name}</h2>
            </div>
            {version ? (
              <p className={featured ? "font-mono text-xs text-purple-200" : "font-mono text-xs text-purple-600/80"}>{version}</p>
            ) : (
              <p className={featured ? "text-xs text-purple-100/60" : "text-xs text-slate-400"}>Coming soon</p>
            )}
          </div>
          {featured && (
            <span 
              className="mt-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse" 
              title="Detected OS" 
              aria-label="Detected OS"
            />
          )}
        </div>

        <div className="mt-5 flex flex-1 flex-col gap-2">
          {comingSoon || downloads.length === 0 ? (
            <div className={featured ? "rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-purple-100/70 backdrop-blur-md" : "rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-400"}>
              Builds begin after signing is configured.
            </div>
          ) : (
            downloads.map(({ label, asset }) => (
              <DownloadButton key={label} asset={asset} label={label} featured={featured} />
            ))
          )}
        </div>

        <div className={featured ? "mt-5 grid gap-2 border-t border-white/10 pt-4 text-xs" : "mt-5 grid gap-2 border-t border-slate-100 pt-4 text-xs"}>
          <div className="flex items-center justify-between gap-4">
            <span className={featured ? "text-purple-100/55" : "text-slate-400"}>Channel</span>
            <span className={featured ? "font-medium text-purple-100" : "font-medium text-purple-700"}>Alpha</span>
          </div>
          {releaseUrl && (
            <div className="flex items-center justify-between gap-4">
              <span className={featured ? "text-purple-100/55" : "text-slate-400"}>Release notes</span>
              <a
                href={releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={featured ? "flex items-center gap-1 font-medium text-purple-100/80 transition hover:text-white" : "flex items-center gap-1 font-medium text-slate-500 transition hover:text-purple-700"}
              >
                GitHub <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function DownloadPlatformCards({ platforms }: DownloadPlatformCardsProps) {
  const [detectedPlatform, setDetectedPlatform] = useState<PlatformName | null>(null);

  useEffect(() => {
    setDetectedPlatform(detectPlatform());
  }, []);

  return (
    <div className="mt-16 grid gap-5 md:grid-cols-3">
      {platforms.map((platform) => (
        <PlatformCard
          key={platform.name}
          {...platform}
          featured={detectedPlatform === platform.name}
        />
      ))}
    </div>
  );
}
