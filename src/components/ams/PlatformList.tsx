import { ArrowDownToLine } from "lucide-react";
import type { ReleaseAsset } from "@/lib/releases";

/**
 * Every build in the release, as a list.
 *
 * The three cards this replaces made the visitor choose between equals,
 * and one of them was painted dark with an animated particle canvas behind
 * it, which drew the eye to whichever platform happened to be featured
 * rather than to theirs. The primary button above already picks for them;
 * this is the fallback, and a fallback should be quiet and complete.
 *
 * Sizes are shown because a 90 MB AppImage and an 8 MB installer are a
 * different decision on a conference network.
 */

export type PlatformBuild = {
  os: string;
  requirement: string;
  files: { label: string; asset: ReleaseAsset }[];
};

function size(bytes: number): string {
  if (!bytes) return "";
  return bytes > 1_000_000
    ? `${(bytes / 1_000_000).toFixed(0)} MB`
    : `${(bytes / 1_000).toFixed(0)} KB`;
}

export function PlatformList({ platforms }: { platforms: PlatformBuild[] }) {
  return (
    <div className="divide-y divide-ink/10 overflow-hidden rounded-panel border border-line bg-surface">
      {platforms.map((platform) => (
        <div key={platform.os} className="grid gap-4 p-5 sm:grid-cols-[14rem_1fr] sm:p-6">
          <div>
            <h3 className="font-display text-lg text-ink">{platform.os}</h3>
            <p className="mt-1 text-sm text-muted">{platform.requirement}</p>
          </div>

          {platform.files.length === 0 ? (
            <p className="self-center text-sm text-muted">Not in this release.</p>
          ) : (
            <ul className="space-y-2">
              {platform.files.map(({ label, asset }) => (
                <li key={label}>
                  <a
                    href={asset.url}
                    className="group flex flex-col items-start gap-2 rounded-control border border-line px-4 py-2.5 transition-colors hover:border-violet/50 hover:bg-violet-soft sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <span className="font-body text-sm text-ink">{label}</span>
                    <span className="flex items-center gap-3 self-stretch sm:self-auto">
                      <span className="font-mono text-xs text-muted">{size(asset.size)}</span>
                      <ArrowDownToLine className="h-4 w-4 text-muted transition-colors group-hover:text-violet" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
