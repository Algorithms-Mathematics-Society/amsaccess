"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowRight } from "lucide-react";
import { PlatformLogo } from "@/components/PlatformLogo";
import {
  readDownloadDevice,
  type DownloadDeviceDetails,
  type DownloadPlatform,
  type DeviceArchitecture,
} from "@/lib/download-platform";
import { recommendDownload, type LinuxFamily } from "@/lib/download-recommendation";
import type { DownloadOption } from "./download-options";
import styles from "./download.module.css";

export function DownloadChoices({ options }: { options: DownloadOption[] }) {
  const [detected, setDetected] = useState<DownloadDeviceDetails>({
    device: "unknown", architecture: "unknown",
  });
  const [checking, setChecking] = useState(true);
  const [chosenDevice, setChosenDevice] = useState<DownloadPlatform | "">("");
  const [chosenArchitecture, setChosenArchitecture] = useState<DeviceArchitecture | null>(null);
  const [linuxFamily, setLinuxFamily] = useState<LinuxFamily>("");
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    let active = true;
    readDownloadDevice(navigator).then((result) => {
      if (active) {
        setDetected(result);
        setChecking(false);
      }
    });
    return () => { active = false; };
  }, []);
  const device = chosenDevice || detected.device;
  const architecture = chosenArchitecture ?? detected.architecture;
  const recommendation = recommendDownload(options, { device, architecture }, linuxFamily);
  const selected = Boolean(chosenDevice || chosenArchitecture !== null || linuxFamily);
  const ready = !checking && recommendation.kind === "ready";
  const showHelper = !checking && (!ready || editing);
  const isDesktop = device === "windows" || device === "macos" || device === "linux";
  const hasDownloads = options.some((option) => option.files.length + option.alternatives.length > 0);
  const recommendedFile = ready ? recommendation.file : undefined;
  const recommendedButtonLabel = device === "macos" ? "Download for Mac"
    : device === "linux" ? "Download " + (recommendedFile?.format === "appimage" ? "AppImage" : "." + recommendedFile?.format)
    : recommendedFile?.label ?? "Download";

  return (
    <div data-download-device={device}>
      <section
        className={styles.recommendation}
        aria-labelledby="recommendation-title"
        data-download-recommendation
        data-recommendation-kind={checking ? "checking" : recommendation.kind}
      >
        <div className={styles.recommendationTop}>
          <div>
            <p className={styles.eyebrow}>
              {ready ? selected ? "Recommended for your selection" : "Recommended for this device" : "Find your download"}
            </p>
            <h2 id="recommendation-title">
              {checking ? "Finding your download…" : recommendation.title}
            </h2>
            <p className={styles.recommendationDescription} role="status" aria-live="polite">
              {checking ? "Checking the device details available from your browser." : recommendation.description}
            </p>
            {ready && recommendedFile && (
              <p className={styles.fileSummary}>
                {recommendedFile.detail}{recommendedFile.size && " · " + recommendedFile.size}
              </p>
            )}
          </div>
          <div className={styles.recommendationActions}>
            {ready && recommendedFile && (
              <a
                href={recommendedFile.href}
                className={styles.downloadButton}
                data-recommended-download
                aria-label={recommendedButtonLabel + " — " + recommendedFile.detail}
              >
                {recommendedButtonLabel}
                <ArrowDownToLine size={16} aria-hidden="true" />
              </a>
            )}
            <a href="#all-downloads" className={styles.otherVersions}>
              {ready ? "Choose another version" : "View all downloads"}
              <ArrowRight size={14} aria-hidden="true" />
            </a>
            {ready && (
              <button type="button" className={styles.helperToggle}
                aria-expanded={editing} aria-controls="download-helper"
                onClick={() => setEditing((value) => !value)}>
                {editing ? "Hide device details" : "Change device details"}
              </button>
            )}
          </div>
        </div>
        <div id="download-helper" hidden={!showHelper || !hasDownloads} className={styles.downloadHelper}>
          <div className={styles.deviceFields}>
            <div className={styles.deviceField}>
              <label htmlFor="download-system">Downloading for</label>
              <select id="download-system" value={isDesktop ? device : ""}
                onChange={(event) => {
                  const next = event.target.value as DownloadPlatform | "";
                  setChosenDevice(next);
                  setChosenArchitecture(next === detected.device ? null : "unknown");
                  setLinuxFamily("");
                  setEditing(true);
                }}>
                <option value="" disabled>Choose operating system</option>
                <option value="windows">Windows</option>
                <option value="macos">macOS</option>
                <option value="linux">Linux</option>
              </select>
            </div>
            {isDesktop && (
              <div className={styles.deviceField}>
                <label htmlFor="download-processor">{device === "macos" ? "Mac chip" : "Processor"}</label>
                <select id="download-processor" value={architecture} aria-describedby="processor-help"
                  onChange={(event) => {
                    setChosenArchitecture(event.target.value as DeviceArchitecture);
                    setEditing(true);
                  }}>
                  <option value="unknown">Not sure yet</option>
                  <option value="x64">{device === "macos" ? "Intel" : "64-bit Intel / AMD (x86_64)"}</option>
                  <option value="arm64">{device === "macos" ? "Apple silicon (M-series)" : "ARM64"}</option>
                  <option value="unsupported">32-bit / another processor</option>
                </select>
                <p id="processor-help">
                  {device === "macos"
                    ? "Apple menu → About This Mac → Chip or Processor."
                    : device === "windows"
                    ? "Settings → System → About → System type."
                    : <>In a terminal, <code>uname -m</code> shows x86_64 for Intel / AMD or aarch64 for ARM64.</>}
                </p>
              </div>
            )}
            {device === "linux" && (
              <div className={styles.deviceField}>
                <label htmlFor="download-distribution">Linux distribution</label>
                <select id="download-distribution" value={linuxFamily} aria-describedby="distribution-help"
                  onChange={(event) => { setLinuxFamily(event.target.value as LinuxFamily); setEditing(true); }}>
                  <option value="">Choose distribution</option>
                  <option value="deb">Ubuntu / Debian / Linux Mint</option>
                  <option value="rpm">Fedora / RHEL</option>
                  <option value="appimage">Other / not sure — AppImage</option>
                </select>
                <p id="distribution-help">Check your system’s About page for its distribution name.</p>
              </div>
            )}
          </div>
          <p className={styles.devicePrivacy}>Device detection stays in your browser. You can change these choices at any time.</p>
        </div>
        <p className={styles.readinessNote}>
          Choosing an installer doesn’t verify assessment readiness. Complete the checks in Access before your round.
        </p>
      </section>

      <div id="all-downloads" className={styles.choicesIntro}>
        <h2>All downloads</h2>
        <span>Downloading for another computer? Choose its version below.</span>
      </div>
      <div className={styles.platforms}>
        {options.map((option) => {
          const available = option.files.length + option.alternatives.length > 0;
          return (
            <section key={option.id} className={styles.platform}
              data-platform={option.id} data-detected={device === option.id}
              aria-labelledby={"download-" + option.id}>
              <div className={styles.platformTop}>
                <PlatformLogo platform={option.name} width={26} height={26} />
                <span className={styles.deviceBadge}>
                  {device === option.id ? selected ? "Selected platform" : "This device" : ""}
                </span>
              </div>
              <h2 id={"download-" + option.id}>{option.name}</h2>
              <p className={styles.requirement}>{option.requirement}</p>
              <div className={styles.files}>
                {option.files.map((file) => (
                  <div className={styles.file} key={file.href} data-recommended={recommendedFile?.href === file.href}>
                    {recommendedFile?.href === file.href && <span className={styles.fileBadge}>Recommended</span>}
                    <a href={file.href} className={styles.downloadButton}
                      aria-label={"Download " + file.label.replace("Download ", "") + " — " + file.detail}>
                      {file.label}<ArrowDownToLine size={16} aria-hidden="true" />
                    </a>
                    <p>{file.detail}{file.size && <> <span aria-hidden="true">·</span> {file.size}</>}</p>
                  </div>
                ))}
                {option.alternatives.length > 0 && (
                  <div className={styles.alternatives}>
                    {option.alternatives.map((file) => (
                      <a href={file.href} key={file.href} data-recommended={recommendedFile?.href === file.href}
                        aria-label={"Download " + file.label + " " + file.detail}>
                        <span>
                          {file.label}
                          {recommendedFile?.href === file.href && <span className={styles.fileBadge}>Recommended</span>}
                          <small>{file.detail} {file.size && "· " + file.size}</small>
                        </span>
                        <ArrowDownToLine size={14} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                )}
                {!available && <p className={styles.unavailable}>A download for {option.name} is not available right now.</p>}
              </div>
              <p className={styles.platformHelp}>{option.help}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
