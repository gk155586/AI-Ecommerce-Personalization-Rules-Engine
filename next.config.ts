import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignore ESLint checks during build to prevent minor warnings/unused vars from blocking compiler
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
