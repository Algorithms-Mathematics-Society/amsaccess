/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join("; ")
  }
];

const publicCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800"
  }
];

const immutableAssetHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=31536000, immutable"
  }
];

const publicRoutes = [
  "/",
  "/product",
  "/pricing",
  "/download",
  "/docs",
  "/changelog",
  "/contact",
  "/controlled-round"
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      },
      ...publicRoutes.map((source) => ({
        source,
        headers: publicCacheHeaders
      })),
      {
        source: "/:path*\\.(svg|png|jpg|jpeg|gif|webp|ico|avif|woff|woff2)",
        headers: immutableAssetHeaders
      }
    ];
  }
};

export default nextConfig;
