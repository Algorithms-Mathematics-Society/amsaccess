import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Container, Eyebrow } from "@/components/ams/primitives";
import { PrimaryDownload } from "@/components/ams/DownloadHero";
import { PlatformList, type PlatformBuild } from "@/components/ams/PlatformList";
import { fetchLatestRelease } from "@/lib/releases";
import type { ReleaseAsset } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Download",
  description: "AMS Access for Windows, macOS and Linux.",
};

/**
 * The download page, shaped like a download page.
 *
 * One primary button that already knows the visitor's platform, then every
 * build listed plainly underneath. The three equal cards this replaces
 * asked a question the browser could answer, and painted one of them dark
 * with an animated particle canvas, which drew the eye to whichever
 * platform was featured rather than to the visitor's.
 *
 * Downloads go through /api/releases/download rather than straight to the
 * asset, which is what keeps them behind an org login.
 */

function gated(
  asset: ReleaseAsset,
  platform: "windows" | "linux" | "macos",
  type: string,
): ReleaseAsset {
  return { ...asset, url: `/api/releases/download?platform=${platform}&type=${type}` };
}

export default async function DownloadPage() {
  const release = await fetchLatestRelease();

  const windows: PlatformBuild["files"] = [];
  if (release?.windows.msi)
    windows.push({ label: "Installer (.msi)", asset: gated(release.windows.msi, "windows", "msi") });
  if (release?.windows.exe)
    windows.push({ label: "Setup (.exe)", asset: gated(release.windows.exe, "windows", "exe") });

  const macos: PlatformBuild["files"] = [];
  if (release?.macos.dmg)
    macos.push({ label: "Universal (.dmg)", asset: gated(release.macos.dmg, "macos", "dmg") });

  const linux: PlatformBuild["files"] = [];
  if (release?.linux.appimage)
    linux.push({ label: "AppImage", asset: gated(release.linux.appimage, "linux", "appimage") });
  if (release?.linux.deb)
    linux.push({ label: "Debian, Ubuntu (.deb)", asset: gated(release.linux.deb, "linux", "deb") });
  if (release?.linux.rpm)
    linux.push({ label: "Fedora, RHEL (.rpm)", asset: gated(release.linux.rpm, "linux", "rpm") });

  const platforms: PlatformBuild[] = [
    { os: "Windows", requirement: "Windows 10 or newer", files: windows },
    { os: "macOS", requirement: "macOS 12 or newer", files: macos },
    { os: "Linux", requirement: "GNOME, KDE or similar", files: linux },
  ];

  // The primary button needs one href per platform, and the first build is
  // the one most people want: the installer, not the portable image.
  const preferred = {
    windows: windows[0]?.asset.url ?? null,
    macos: macos[0]?.asset.url ?? null,
    linux: linux[0]?.asset.url ?? null,
  };

  return (
    <main className="min-h-screen bg-cream font-body text-ink antialiased">
      <MarketingHeader />

      <section className="pb-14 pt-28 sm:pt-36">
        <Container>
          <Eyebrow>Download</Eyebrow>
          <h1 className="mt-3 max-w-2xl font-display text-[clamp(2.25rem,3.6vw+0.75rem,3.75rem)] leading-[1.04] text-ink">
            AMS Access for the desktop.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-ink/65">
            Candidates sit a round in this app. Everything else, from setting problems to reading
            the results, is in the browser.
          </p>

          <div className="mt-8">
            <PrimaryDownload available={preferred} version={release?.version ?? null} />
          </div>

          {release && (
            <p className="mt-4 font-mono text-xs text-ink/45">
              {release.version} &middot;{" "}
              {new Date(release.publishedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              &middot;{" "}
              <Link href="/changelog" className="text-gold-deep underline-offset-4 hover:underline">
                release notes
              </Link>
            </p>
          )}
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <PlatformList platforms={platforms} />

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-panel border border-ink/10 p-5">
              <h2 className="font-display text-base text-ink">Verifying a download</h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">
                Every release publishes a <code className="font-mono text-xs">SHA256SUMS</code>{" "}
                file per platform. macOS builds are signed and notarised, so Gatekeeper opens them
                without a warning.
              </p>
            </div>
            <div className="rounded-panel border border-ink/10 p-5">
              <h2 className="font-display text-base text-ink">Updating</h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">
                Install over the top. Sessions are held on the server, so an update between rounds
                costs nothing.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <MarketingFooter />
    </main>
  );
}
