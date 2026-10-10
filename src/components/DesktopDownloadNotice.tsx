import { Monitor } from "lucide-react";

export function DesktopDownloadNotice({ className = "" }: { className?: string }) {
  return (
    <div className={`flex max-w-md items-start gap-3 rounded-panel border border-line bg-surface px-4 py-3 text-left ${className}`}>
      <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-violet" />
      <div>
        <p className="text-sm font-semibold text-ink">Visit on desktop to download</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          AMS Access is a desktop application for Windows, macOS, and Linux.
        </p>
      </div>
    </div>
  );
}
