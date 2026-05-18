import Link from "next/link";
import { ArrowDownToLine, ArrowRight, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { PlatformLogo } from "@/components/PlatformLogo";
import type { LatestRelease, ReleaseAsset } from "@/app/api/releases/latest/route";

async function fetchLatestRelease(): Promise<LatestRelease | null> {
  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const res = await fetch(`${base}/api/releases/latest`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function fmtBytes(bytes: number) {
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
  return `${(bytes / 1_000).toFixed(0)} KB`;
}

function DownloadButton({ asset, label }: { asset: ReleaseAsset; label: string }) {
  return (
    <a
      href={asset.url}
      className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-purple-300/30 hover:bg-white/[0.07]"
    >
      <span className="font-medium text-white/80 group-hover:text-white">{label}</span>
      <span className="flex items-center gap-2 text-xs text-white/35 group-hover:text-white/55">
        {fmtBytes(asset.size)}
        <ArrowDownToLine className="h-3.5 w-3.5" />
      </span>
    </a>
  );
}

interface PlatformCardProps {
  name: "Windows" | "macOS" | "Linux";
  downloads: { label: string; asset: ReleaseAsset }[];
  version: string | null;
  releaseUrl: string | null;
  comingSoon?: boolean;
  featured?: boolean;
}

function PlatformCard({ name, downloads, version, releaseUrl, comingSoon, featured }: PlatformCardProps) {
  return (
    <article className={`glass-card p-6 ${featured ? "ams-card-featured" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">{name}</h2>
          {version ? (
            <p className="mt-1.5 font-mono text-xs text-purple-300/70">{version}</p>
          ) : (
            <p className="mt-1.5 text-xs text-white/35">Coming soon</p>
          )}
        </div>
        <PlatformLogo platform={name} className="h-5 w-5 text-white/75" />
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {comingSoon || downloads.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/35">
            Builds begin after signing is configured.
          </div>
        ) : (
          downloads.map(({ label, asset }) => (
            <DownloadButton key={label} asset={asset} label={label} />
          ))
        )}
      </div>

      <div className="mt-6 grid gap-2 border-t border-white/10 pt-5 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-white/35">Channel</span>
          <span className="text-purple-200">Alpha</span>
        </div>
        {releaseUrl && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/35">Release notes</span>
            <a
              href={releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-white/55 transition hover:text-purple-200"
            >
              GitHub <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

export default async function DownloadPage() {
  const release = await fetchLatestRelease();

  const windowsDownloads: { label: string; asset: ReleaseAsset }[] = [];
  if (release?.windows.msi) windowsDownloads.push({ label: "Windows — MSI Installer", asset: release.windows.msi });
  if (release?.windows.exe) windowsDownloads.push({ label: "Windows — Setup (.exe)", asset: release.windows.exe });

  const linuxDownloads: { label: string; asset: ReleaseAsset }[] = [];
  if (release?.linux.appimage) linuxDownloads.push({ label: "Linux — AppImage", asset: release.linux.appimage });
  if (release?.linux.deb) linuxDownloads.push({ label: "Linux — Debian / Ubuntu (.deb)", asset: release.linux.deb });
  if (release?.linux.rpm) linuxDownloads.push({ label: "Linux — Fedora / RHEL (.rpm)", asset: release.linux.rpm });

  const macDownloads: { label: string; asset: ReleaseAsset }[] = [];
  if (release?.macos.dmg) macDownloads.push({ label: "macOS — Universal DMG", asset: release.macos.dmg });

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <MarketingHeader />
      <section
        className="raycast-hero ams-hero-grid relative min-h-screen overflow-hidden px-5 pb-24 pt-36"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div className="raycast-hero-bg" />
        <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6] opacity-20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="ams-label mb-6">Download</p>
            <h1 className="bg-gradient-to-b from-white via-[#F4F4F5] to-[#A1A1AA] bg-clip-text text-5xl font-semibold leading-[0.96] tracking-tight text-transparent md:text-7xl">
              Download Access by AMS
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-white/60">
              The desktop exam shell for controlled rounds — keyboard lockdown, proctoring, and session enforcement built in.
            </p>
            {release && (
              <p className="mt-3 font-mono text-sm text-white/35">
                Latest: <span className="text-purple-300/80">{release.version}</span>
                {" · "}
                {new Date(release.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
                href="/changelog"
              >
                View Changelog
              </Link>
              {release?.releaseUrl && (
                <a
                  href={release.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/10 px-5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
                >
                  GitHub Release <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
                href="/docs"
              >
                Read Docs <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-20 grid gap-5 md:grid-cols-3">
            <PlatformCard
              name="Windows"
              downloads={windowsDownloads}
              version={release?.version ?? null}
              releaseUrl={release?.releaseUrl ?? null}
              featured
            />
            <PlatformCard
              name="Linux"
              downloads={linuxDownloads}
              version={release?.version ?? null}
              releaseUrl={release?.releaseUrl ?? null}
            />
            <PlatformCard
              name="macOS"
              downloads={macDownloads}
              version={macDownloads.length > 0 ? (release?.version ?? null) : null}
              releaseUrl={release?.releaseUrl ?? null}
              comingSoon={macDownloads.length === 0}
            />
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
            <section className="glass-card p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-purple-200" />
                <h2 className="text-lg font-semibold tracking-tight text-white">System requirements</h2>
              </div>
              <div className="mt-6 grid gap-3 text-sm leading-6 text-white/65 md:grid-cols-3 md:text-white/50">
                <p>Windows 10 or newer.</p>
                <p>macOS 12 or newer.</p>
                <p>Modern Linux desktop environment (GNOME, KDE, etc.)</p>
              </div>
            </section>
            <section className="glass-card p-6">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-200" />
                <h2 className="text-lg font-semibold tracking-tight text-white">Release notes</h2>
              </div>
              <p className="mt-5 text-sm leading-6 text-white/65 md:text-white/50">
                Each release publishes with build integrity details and a full changelog on GitHub.
              </p>
              {release?.releaseUrl ? (
                <a
                  href={release.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-white transition hover:text-purple-200"
                >
                  View on GitHub <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <Link
                  className="mt-6 inline-flex text-sm font-medium text-white transition hover:text-purple-200"
                  href="/changelog"
                >
                  View release history
                </Link>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
