import type { NextConfig } from "next";

const R2_PUBLIC_HOST = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname
  : "";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment (no need for full node_modules)
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: R2_PUBLIC_HOST,
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        pathname: "/**",
      },
    ],
    // Bypass image optimization to leverage zero egress from R2
    unoptimized: true,
  },
  // Proxy API calls to FastAPI backend (same container, localhost)
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;


