"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { PlatformLogo } from "@/components/PlatformLogo";
import {
  detectDownloadDevice,
  type DownloadDevice,
} from "@/lib/download-platform";
import type { DownloadOption } from "./download-options";
import styles from "./download.module.css";

export function DownloadChoices({ options }: { options: DownloadOption[] }) {
  const [device, setDevice] = useState<DownloadDevice>("unknown");
  useEffect(() => {
    setDevice(
      detectDownloadDevice(
        navigator.userAgent,
        navigator.platform,
        navigator.maxTouchPoints,
      ),
    );
  }, []);
  return (
    <div data-download-device={device}>
      <div className={styles.choicesIntro}>
        <p>Choose your operating system.</p>
        <span>
          {device === "mobile"
            ? "Use a desktop or laptop for your assessment."
            : "Downloading for another computer? Choose its platform below."}
        </span>
      </div>
      <div className={styles.platforms}>
        {options.map((option) => {
          const available =
            option.files.length + option.alternatives.length > 0;
          return (
            <section
              key={option.id}
              className={styles.platform}
              data-platform={option.id}
              data-detected={device === option.id}
              aria-labelledby={"download-" + option.id}
            >
              <div className={styles.platformTop}>
                <PlatformLogo platform={option.name} width={26} height={26} />
                <span className={styles.deviceBadge}>
                  {device === option.id ? "This device" : ""}
                </span>
              </div>
              <h2 id={"download-" + option.id}>{option.name}</h2>
              <p className={styles.requirement}>{option.requirement}</p>
              <div className={styles.files}>
                {option.files.map((file) => (
                  <div className={styles.file} key={file.href}>
                    <a
                      href={file.href}
                      className={styles.downloadButton}
                      aria-label={
                        option.id === "macos"
                          ? "Download for " +
                            file.label.replace("Download for ", "")
                          : file.label
                      }
                    >
                      {file.label}
                      <ArrowDownToLine size={16} aria-hidden="true" />
                    </a>
                    <p>
                      {file.detail}
                      {file.size && (
                        <>
                          {" "}
                          <span aria-hidden="true">·</span> {file.size}
                        </>
                      )}
                    </p>
                  </div>
                ))}
                {option.alternatives.length > 0 && (
                  <div className={styles.alternatives}>
                    {option.alternatives.map((file) => (
                      <a
                        href={file.href}
                        key={file.href}
                        aria-label={
                          "Download " + file.label + " " + file.detail
                        }
                      >
                        <span>
                          {file.label}
                          <small>
                            {file.detail} {file.size && "· " + file.size}
                          </small>
                        </span>
                        <ArrowDownToLine size={14} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                )}
                {!available && (
                  <p className={styles.unavailable}>
                    A download for {option.name} is not available right now.
                  </p>
                )}
              </div>
              <p className={styles.platformHelp}>{option.help}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
