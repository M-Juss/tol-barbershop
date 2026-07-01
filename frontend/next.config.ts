import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api(\/v\d+)?\/?$/, "") || "http://localhost:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["sterile-neatly-earflap.ngrok-free.dev"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
      {
        source: "/storage/:path*",
        destination: `${API_URL}/storage/:path*`,
      },
    ];
  },
};

export default nextConfig;
