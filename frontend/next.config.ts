import type { NextConfig } from "next";

const R2_PUBLIC_HOST = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname
  : "pub-b5b4e53af6574d55aa946f394ac86c8a.r2.dev";

const nextConfig: NextConfig = {
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
    unoptimized: false, // Enable Vercel Image Optimization
  },
};

export default nextConfig;


