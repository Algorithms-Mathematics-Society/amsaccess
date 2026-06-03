import Link from "next/link";
import { ShieldCheck, FileText } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";
import { DownloadPlatformCards } from "@/components/DownloadPlatformCards";
import { fetchLatestRelease } from "@/lib/releases";
import type { ReleaseAsset } from "@/lib/releases";

function protectedAsset(asset: ReleaseAsset, platform: "windows" | "linux" | "macos", type: string): ReleaseAsset {
  return {
    ...asset,
    url: "/api/releases/download?platform=" + platform + "&type=" + type,
  };
}

export default async function DownloadPage() {
  const release = await fetchLatestRelease();

  const windowsDownloads: { label: string; asset: ReleaseAsset }[] = [];
  if (release?.windows.msi) windowsDownloads.push({ label: "MSI Installer", asset: protectedAsset(release.windows.msi, "windows", "msi") });
  if (release?.windows.exe) windowsDownloads.push({ label: "Setup (.exe)", asset: protectedAsset(release.windows.exe, "windows", "exe") });

  const linuxDownloads: { label: string; asset: ReleaseAsset }[] = [];
  if (release?.linux.appimage) linuxDownloads.push({ label: "AppImage", asset: protectedAsset(release.linux.appimage, "linux", "appimage") });
  if (release?.linux.deb) linuxDownloads.push({ label: "Debian / Ubuntu (.deb)", asset: protectedAsset(release.linux.deb, "linux", "deb") });
  if (release?.linux.rpm) linuxDownloads.push({ label: "Fedora / RHEL (.rpm)", asset: protectedAsset(release.linux.rpm, "linux", "rpm") });

  const macDownloads: { label: string; asset: ReleaseAsset }[] = [];
  if (release?.macos.dmg) macDownloads.push({ label: "Universal DMG", asset: protectedAsset(release.macos.dmg, "macos", "dmg") });

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900 selection:bg-purple-200 selection:text-purple-900">
      <MarketingHeader />

      <section className="relative min-h-screen overflow-hidden px-5 pb-24 pt-36">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-50/60 via-transparent to-slate-50/40" />

        <div className="relative z-10 mx-auto max-w-6xl">
          {/* Header */}
          <div className="max-w-3xl">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Download</p>
            <h1 className="text-5xl font-semibold leading-[0.96] tracking-tight text-slate-900 md:text-7xl">
              Download Access by AMS
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-slate-500">
              The desktop exam shell for controlled rounds — keyboard lockdown, proctoring, and session enforcement built in.
            </p>
            {release && (
              <p className="mt-3 font-mono text-sm text-slate-400">
                Latest:{" "}
                <span className="text-purple-700">{release.version}</span>
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
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
                href="/changelog"
              >
                View Changelog
              </Link>
            </div>
          </div>

          {/* Platform cards */}
          <DownloadPlatformCards
            platforms={[
              {
                name: "Linux",
                downloads: linuxDownloads,
                version: release?.version ?? null,
              },
              {
                name: "Windows",
                downloads: windowsDownloads,
                version: release?.version ?? null,
              },
              {
                name: "macOS",
                downloads: macDownloads,
                version: macDownloads.length > 0 ? (release?.version ?? null) : null,
                comingSoon: macDownloads.length === 0,
              },
            ]}
          />

          {/* System requirements + release notes */}
          <div className="mt-8 grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <ShieldCheck className="h-4 w-4 text-slate-600" />
                </span>
                <h2 className="text-base font-semibold tracking-tight text-slate-900">System requirements</h2>
              </div>
              <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-500 md:grid-cols-3">
                <p><span className="font-medium text-slate-700">Windows</span><br />Windows 10 or newer.</p>
                <p><span className="font-medium text-slate-700">macOS</span><br />macOS 12 or newer.</p>
                <p><span className="font-medium text-slate-700">Linux</span><br />Modern desktop environment (GNOME, KDE, etc.)</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <FileText className="h-4 w-4 text-slate-600" />
                </span>
                <h2 className="text-base font-semibold tracking-tight text-slate-900">Release notes</h2>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                Each release publishes with build integrity details and a full internal changelog.
              </p>
              <Link
                className="mt-5 inline-flex text-sm font-semibold text-purple-700 transition hover:text-purple-900"
                href="/changelog"
              >
                View release history
              </Link>
            </section>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
