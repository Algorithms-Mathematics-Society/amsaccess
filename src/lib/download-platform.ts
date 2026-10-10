export type DownloadPlatform = "windows" | "macos" | "linux";
export type DownloadDevice = DownloadPlatform | "mobile" | "unknown";
export type DeviceArchitecture = "x64" | "arm64" | "unsupported" | "unknown";
export type DownloadDeviceDetails = {
  device: DownloadDevice;
  architecture: DeviceArchitecture;
};

// Ordinary Mac browser IDs do not distinguish Intel from Apple silicon.
export function detectDownloadDevice(
  userAgent: string,
  platform = "",
  maxTouchPoints = 0,
): DownloadDevice {
  if (
    /android|iphone|ipad|ipod/i.test(userAgent) ||
    (/mac/i.test(platform) && maxTouchPoints > 1)
  ) return "mobile";
  if (/cros/i.test(userAgent)) return "unknown";
  if (/windows/i.test(userAgent)) return "windows";
  if (/macintosh|mac os x/i.test(userAgent)) return "macos";
  if (/linux/i.test(userAgent)) return "linux";
  return "unknown";
}

type BrowserDetails = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  userAgentData?: {
    getHighEntropyValues?: (hints: string[]) => Promise<{
      architecture?: string;
      bitness?: string;
    }>;
  };
};

export function architectureFromHints(
  architecture = "",
  bitness = "",
): DeviceArchitecture {
  if (!architecture) return "unknown";
  if (bitness === "32") return "unsupported";
  if (bitness !== "64") return "unknown";
  if (architecture === "arm") return "arm64";
  if (architecture === "x86") return "x64";
  return "unsupported";
}

// Read only the two details needed to choose an installer. Nothing is stored
// or sent to our server. Missing, denied, or slow hints leave the choice open.
export async function readDownloadDevice(
  browser: BrowserDetails,
): Promise<DownloadDeviceDetails> {
  const device = detectDownloadDevice(
    browser.userAgent, browser.platform, browser.maxTouchPoints,
  );
  const fallback: DownloadDeviceDetails = { device, architecture: "unknown" };
  const data = browser.userAgentData;
  if (device === "mobile" || device === "unknown" || !data?.getHighEntropyValues)
    return fallback;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const hints = await Promise.race([
      data.getHighEntropyValues(["architecture", "bitness"]),
      new Promise<null>((resolve) => { timeout = setTimeout(() => resolve(null), 700); }),
    ]);
    return hints
      ? { device, architecture: architectureFromHints(hints.architecture, hints.bitness) }
      : fallback;
  } catch {
    return fallback;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
