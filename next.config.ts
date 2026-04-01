import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-build-2",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
