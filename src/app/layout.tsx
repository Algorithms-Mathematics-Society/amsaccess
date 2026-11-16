import type { Metadata } from "next";
import "./fonts.css";
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
  title: {
    default: "AMS Access",
    template: "%s · AMS Access",
  },
  description: "Proctored contests and assessments, run by AMS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/inter-latin-c940764593d0.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/source-serif-4-latin-8e38e3fbd74d.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />

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
            `,
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
                    "urls": ["/download", "/contact"]
                  }
                ]
              }
            `,
          }}
        />
      </head>
      <body className="font-sans bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
