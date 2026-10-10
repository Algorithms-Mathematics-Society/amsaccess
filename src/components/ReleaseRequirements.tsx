import Link from "next/link";
import { fetchLatestRelease, type LatestRelease } from "@/lib/releases";
import { requirementsFor, REQUIREMENTS_GUIDE_PATH } from "@/lib/release-requirements";
import styles from "./ReleaseRequirements.module.css";

export async function ReleaseRequirements({ release: supplied, showGuide = true }: {
  release?: LatestRelease | null; showGuide?: boolean;
}) {
  const release = supplied === undefined ? await fetchLatestRelease() : supplied;
  const requirements = requirementsFor(release);
  return (
    <div className={styles.requirements} data-release-requirements>
      <h3>{release ? `Installer requirements · ${release.version}` : "Installer requirements"}</h3>
      {requirements ? (
        <>
          <dl>
            <div><dt>Windows</dt><dd>{requirements.windows}</dd></div>
            <div><dt>macOS</dt><dd>{requirements.macos}</dd></div>
            <div><dt>Linux</dt><dd>{requirements.linux}</dd></div>
          </dl>
          <ul>{requirements.notes.map(note => <li key={note}>{note}</li>)}</ul>
        </>
      ) : (
        <p>{release
          ? "Requirements for this release have not been confirmed here. Check the installer’s architecture and ask your organizer before installing."
          : "Current release information is unavailable. Check the downloads page again before installing."}</p>
      )}
      <p>An installer choice is separate from the app’s readiness checks. Prepare the device, permissions and connection required for your round.</p>
      {showGuide && <Link href={"https://www.amsaccess.com" + REQUIREMENTS_GUIDE_PATH}>Read the system requirements guide</Link>}
    </div>
  );
}
