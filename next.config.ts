import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/train-radar",
  images: { unoptimized: true },
};

export default nextConfig;
