import type { Metadata } from "next";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMS Derive Online Round",
  description: "Minimal assessment platform for AMS Derive written rounds"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem('ams-theme');
                  var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
                  var isLight = stored ? stored === 'light' : prefersLight;
                  document.documentElement.classList.toggle('light', isLight);
                  document.documentElement.classList.toggle('dark', !isLight);
                } catch (error) {}
              })();
            `
          }}
        />
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: `
              {
                "prerender": [
                  {
                    "source": "list",
                    "urls": ["/pricing", "/docs", "/changelog", "/contact"]
                  }
                ]
              }
            `
          }}
        />
      </head>
      <body className="font-sans bg-black text-white antialiased">{children}</body>
    </html>
  );
}
