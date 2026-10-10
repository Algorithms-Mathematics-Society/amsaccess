"use client";

import { useState } from "react";
import type { DownloadFile } from "./download-options";
import type { DownloadPlatform } from "@/lib/download-platform";
import styles from "./download.module.css";

export function DownloadIntegrity({ file, platform }: { file: DownloadFile; platform: DownloadPlatform }) {
  const [copyStatus, setCopyStatus] = useState("");
  const command = platform === "windows"
    ? `Get-FileHash -LiteralPath '.\\${file.filename}' -Algorithm SHA256`
    : platform === "macos" ? `shasum -a 256 '${file.filename}'` : `sha256sum '${file.filename}'`;
  return (
    <details className={styles.integrity} data-download-integrity>
      <summary>File details &amp; SHA-256</summary>
      <dl>
        <div><dt>Version</dt><dd>{file.version}</dd></div>
        <div><dt>Filename</dt><dd><code>{file.filename}</code></dd></div>
        <div><dt>Size</dt><dd>{file.bytes.toLocaleString("en")} bytes</dd></div>
      </dl>
      {file.sha256 ? (
        <>
          <p>Published SHA-256</p>
          <code className={styles.hash} data-sha256>{file.sha256}</code>
          <button type="button" onClick={async () => {
            try {
              await navigator.clipboard.writeText(file.sha256!);
              setCopyStatus("Checksum copied.");
            } catch {
              setCopyStatus("Could not copy. Select the checksum above and copy it manually.");
            }
          }}>Copy SHA-256</button>
          <p role="status" aria-live="polite">{copyStatus}</p>
          <p>In the folder containing this file, run {platform === "windows" ? "PowerShell" : "a terminal"}:</p>
          <code className={styles.command}>{command}</code>
          <p>Compare the result with the checksum above for this exact filename. A match checks the bytes; it does not verify the publisher or guarantee safety.</p>
        </>
      ) : (
        <p>No SHA-256 is available for this file. Contact the team if you need verification before installing.</p>
      )}
      <a href="https://www.amsaccess.com/docs/verify-download">Verification and installation help</a>
    </details>
  );
}
