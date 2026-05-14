import type { SVGProps } from "react";

type PlatformName = "Windows" | "macOS" | "Linux";

type PlatformLogoProps = SVGProps<SVGSVGElement> & {
  platform: PlatformName;
};

function WindowsLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M3 5.35 10.7 4.3v7.35H3V5.35Zm8.55-1.15L21 2.85v8.8h-9.45V4.2ZM3 12.5h7.7v7.2L3 18.65V12.5Zm8.55 0H21v8.65l-9.45-1.32V12.5Z" />
    </svg>
  );
}

function AppleLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M15.42 2.25c.1 1.02-.3 2.04-.95 2.78-.7.8-1.84 1.42-2.87 1.34-.12-.98.33-2.02.96-2.7.72-.8 1.94-1.39 2.86-1.42ZM20.1 17.34c-.45 1.02-.66 1.48-1.24 2.38-.8 1.23-1.94 2.76-3.35 2.78-1.25.02-1.57-.82-3.27-.8-1.69.01-2.04.82-3.29.8-1.41-.02-2.48-1.4-3.29-2.63-2.25-3.44-2.49-7.47-1.1-9.61.99-1.52 2.55-2.4 4.02-2.4 1.5 0 2.45.83 3.69.83 1.2 0 1.94-.83 3.68-.83 1.31 0 2.71.72 3.69 1.96-3.24 1.78-2.71 6.4.46 7.52Z" />
    </svg>
  );
}

function LinuxLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M12.02 2.25c-1.92 0-3.22 1.62-3.22 3.7 0 1.18.23 2.05.57 2.8-.94.9-1.56 2.24-1.88 3.58l-.4 1.72c-.3.16-.58.38-.83.68-.74.9-1.18 2.34-1.14 3.73.02.75.35 1.36.91 1.73.52.35 1.24.44 2.03.24.7-.18 1.39-.57 1.98-1.1.6.28 1.27.42 1.98.42.73 0 1.42-.15 2.03-.43.58.53 1.27.92 1.97 1.1.79.2 1.51.11 2.04-.24.55-.37.88-.98.9-1.73.04-1.39-.4-2.83-1.13-3.73-.25-.3-.53-.52-.84-.68l-.4-1.72c-.32-1.34-.94-2.68-1.87-3.58.34-.75.56-1.62.56-2.8 0-2.08-1.3-3.7-3.22-3.7Zm-1.37 3.33c.4 0 .72.38.72.84 0 .47-.32.85-.72.85s-.72-.38-.72-.85c0-.46.32-.84.72-.84Zm2.74 0c.4 0 .72.38.72.84 0 .47-.32.85-.72.85s-.72-.38-.72-.85c0-.46.32-.84.72-.84Zm-1.37 2.28c.5 0 .93.2 1.18.52-.3.2-.7.32-1.18.32-.47 0-.88-.12-1.17-.32.25-.32.68-.52 1.17-.52Zm-2.3 4.98h4.6l.37 1.6c.2.88.08 1.72-.38 2.36-.48.67-1.28 1.03-2.29 1.03-1 0-1.8-.36-2.28-1.03-.47-.64-.6-1.48-.39-2.36l.37-1.6Z" />
    </svg>
  );
}

export function PlatformLogo({ platform, ...props }: PlatformLogoProps) {
  if (platform === "Windows") {
    return <WindowsLogo {...props} />;
  }

  if (platform === "macOS") {
    return <AppleLogo {...props} />;
  }

  return <LinuxLogo {...props} />;
}
