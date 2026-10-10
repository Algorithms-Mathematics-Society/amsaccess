export type DownloadPlatform = "windows" | "macos" | "linux";
export type DownloadDevice = DownloadPlatform | "mobile" | "unknown";

// Detect the OS, never the Mac CPU. Intel and Apple silicon share browser IDs.
export function detectDownloadDevice(
  userAgent: string,
  platform = "",
  maxTouchPoints = 0,
): DownloadDevice {
  if (
    /android|iphone|ipad|ipod/i.test(userAgent) ||
    (/mac/i.test(platform) && maxTouchPoints > 1)
  )
    return "mobile";
  if (/windows/i.test(userAgent)) return "windows";
  if (/macintosh|mac os x/i.test(userAgent)) return "macos";
  if (/cros/i.test(userAgent)) return "unknown";
  if (/linux|x11/i.test(userAgent)) return "linux";
  return "unknown";
}
