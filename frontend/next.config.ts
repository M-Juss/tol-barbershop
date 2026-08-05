import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const configuredBackendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

if (!isDevelopment && !configuredBackendUrl) {
  throw new Error("BACKEND_URL must be configured for production builds.");
}

const backendUrl = configuredBackendUrl || "http://localhost:8000";
const parsedBackendUrl = new URL(backendUrl);

const isLocalBackend =
  parsedBackendUrl.hostname === "localhost" ||
  parsedBackendUrl.hostname === "127.0.0.1";

if (
  !isDevelopment &&
  !isLocalBackend &&
  (parsedBackendUrl.protocol !== "https:" ||
    parsedBackendUrl.username ||
    parsedBackendUrl.password ||
    parsedBackendUrl.pathname !== "/" ||
    parsedBackendUrl.search ||
    parsedBackendUrl.hash)
) {
  throw new Error("Production BACKEND_URL must be a clean HTTPS origin.");
}

const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const allowedDevOrigins = isDevelopment
  ? [
      ...new Set(
        [
          "sterile-neatly-earflap.ngrok-free.dev",
          ...(process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(",") ?? []),
        ]
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    ]
  : [];

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://maps.gstatic.com https://maps.googleapis.com",
  "font-src 'self' data:",
  `connect-src 'self'${isDevelopment ? ` ws: wss: http://localhost:8000 ${configuredBackendUrl || "http://localhost:8000"}` : ""}`,
  "frame-src https://www.google.com https://maps.google.com",
  "media-src 'self' https://res.cloudinary.com",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  isDevelopment ? "" : "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  ...(!isDevelopment
    ? [
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin",
        },
        {
          key: "Cross-Origin-Resource-Policy",
          value: "same-origin",
        },
      ]
    : []),
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  ...(!isDevelopment
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_API_URL: "/api/v1",
  },
  allowedDevOrigins,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: cloudinaryCloudName ? `/${cloudinaryCloudName}/**` : "/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/sanctum/:path*",
        destination: `${backendUrl}/sanctum/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/((?!_next/).*)",
        headers: securityHeaders,
      },
      {
        source: "/api/v1/public-services",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/api/v1/public-gallery-images",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/api/v1/public-feedback",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/api/v1/featured-feedback",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/api/v1/public-booking-settings",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/api/v1/public-bootstrap",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/reset-password",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Pragma", value: "no-cache" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/verify-email",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Pragma", value: "no-cache" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
