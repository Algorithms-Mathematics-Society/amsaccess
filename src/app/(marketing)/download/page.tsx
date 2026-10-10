import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Container, Eyebrow } from "@/components/ams/primitives";
import { PrimaryDownload } from "@/components/ams/DownloadHero";
import {
  PlatformList,
  type PlatformBuild,
} from "@/components/ams/PlatformList";
import { DesktopDownloadNotice } from "@/components/DesktopDownloadNotice";
import { fetchLatestRelease } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Download",
  description: "AMS Access for Windows, macOS and Linux.",
};

// Keep public installer availability from main. Public notes are curated on
// /changelog rather than copied from internal release descriptions.
export default async function DownloadPage() {
  const release = await fetchLatestRelease();

  const windows: PlatformBuild["files"] = [];
  if (release?.windows.msi)
    windows.push({ label: "Installer (.msi)", asset: release.windows.msi });
  if (release?.windows.exe)
    windows.push({ label: "Setup (.exe)", asset: release.windows.exe });

  const macos: PlatformBuild["files"] = [];
  if (release?.macos.dmg)
    macos.push({ label: "Universal (.dmg)", asset: release.macos.dmg });

  const linux: PlatformBuild["files"] = [];
  if (release?.linux.appimage)
    linux.push({ label: "AppImage", asset: release.linux.appimage });
  if (release?.linux.deb)
    linux.push({ label: "Debian, Ubuntu (.deb)", asset: release.linux.deb });
  if (release?.linux.rpm)
    linux.push({ label: "Fedora, RHEL (.rpm)", asset: release.linux.rpm });

  const platforms: PlatformBuild[] = [
    { os: "Windows", requirement: "Windows 10 or newer", files: windows },
    {
      os: "macOS",
      requirement: "macOS 12 or newer, Apple silicon and Intel",
      files: macos,
    },
    { os: "Linux", requirement: "GNOME, KDE or similar", files: linux },
  ];

  // The installer, not the portable image: it is what most people want and
  // the only one that puts the app in a launcher.
  const preferred = {
    windows: windows[0]?.asset.url ?? null,
    macos: macos[0]?.asset.url ?? null,
    linux: linux[0]?.asset.url ?? null,
  };

  return (
    <main className="ac-theme min-h-screen bg-paper font-body text-ink antialiased">
      <MarketingHeader />

      <section className="pb-12 pt-28 sm:pt-36">
        <Container>
          <Eyebrow>Download</Eyebrow>
          <h1 className="mt-3 max-w-2xl font-display text-[clamp(2.25rem,3.6vw+0.75rem,3.75rem)] leading-[1.04] text-ink">
            AMS Access for the desktop.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            The Access desktop app for taking assessments. Follow your
            organizer’s instructions to choose and prepare your device.
          </p>

          <div className="mt-8 hidden xl:block">
            <PrimaryDownload
              available={preferred}
              version={release?.version ?? null}
            />
          </div>

          <DesktopDownloadNotice className="mt-8 xl:hidden" />

          {release && (
            <p className="mt-4 font-mono text-xs text-muted">
              {release.version} &middot;{" "}
              {new Date(release.publishedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </Container>
      </section>

      <section className="hidden pb-16 xl:block">
        <Container>
          <PlatformList platforms={platforms} />
        </Container>
      </section>

      <section className="border-t border-line bg-surface py-[clamp(3.75rem,7vw,6.5rem)]">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <Eyebrow>Before you start</Eyebrow>
              <h2 className="mt-3 font-display text-[clamp(1.5rem,1.8vw+0.75rem,2rem)] leading-tight text-ink">
                Three things worth knowing.
              </h2>

              <dl className="mt-6 space-y-5">
                <div>
                  <dt className="font-display text-base text-ink">
                    Follow your invitation
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-muted">
                    Use the access details and sign-in instructions provided by
                    your organizer.
                  </dd>
                </div>
                <div>
                  <dt className="font-display text-base text-ink">
                    Run the device check early
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-muted">
                    Complete the required device and permission checks before
                    the scheduled round.
                  </dd>
                </div>
                <div>
                  <dt className="font-display text-base text-ink">
                    Check your app version
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-muted">
                    Ask your organizer which version to use. Complete any
                    required update before your assessment.
                  </dd>
                </div>
              </dl>
            </div>

            <div id="releases">
              <Eyebrow>Releases</Eyebrow>
              <h2 className="mt-3 font-display text-[clamp(1.5rem,1.8vw+0.75rem,2rem)] leading-tight text-ink">
                What changed.
              </h2>
              <div className="mt-6">
                <p className="text-sm leading-6 text-muted">
                  Read the{" "}
                  <Link
                    href="/changelog"
                    className="underline underline-offset-4"
                  >
                    public release notes
                  </Link>{" "}
                  for published changes, or follow the{" "}
                  <Link
                    href="/docs/candidate-setup"
                    className="underline underline-offset-4"
                  >
                    candidate setup guide
                  </Link>{" "}
                  to prepare.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <MarketingFooter />
    </main>
  );
}
