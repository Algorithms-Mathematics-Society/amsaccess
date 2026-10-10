import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
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

// The AMS house faces. Loaded here rather than in the marketing layout so
// the variables exist on every route and a public page never flashes a
// fallback serif while the font resolves.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AMS Access",
    template: "%s · AMS Access",
  },
  description: "Proctored contests and assessments, run by AMS.",
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${sourceSerif.variable}`}>
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
