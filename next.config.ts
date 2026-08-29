import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is required for the Dockerfile's copy step.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Backblaze B2 public media host — update to the real bucket
        // endpoint/CDN domain once provisioned.
        hostname: "**.backblazeb2.com",
      },
    ],
  },
  experimental: {
    // Server actions are used for cart/checkout mutations from client
    // components where a full API route isn't necessary.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
