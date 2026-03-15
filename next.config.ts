import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/manga2novel-preview",
  assetPrefix: "/manga2novel-preview",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
