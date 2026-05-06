import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      </head>
      <body className={`${inter.className} bg-black text-white antialiased`}>{children}</body>
    </html>
  );
}
