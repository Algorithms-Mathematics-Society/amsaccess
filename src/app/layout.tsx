import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "optional",
  preload: true,
  adjustFontFallback: true
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "optional",
  preload: false,
  adjustFontFallback: true
});

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
                    "urls": ["/pricing", "/docs", "/download", "/changelog", "/contact"]
                  }
                ]
              }
            `
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-black text-white antialiased`}>{children}</body>
    </html>
  );
}
