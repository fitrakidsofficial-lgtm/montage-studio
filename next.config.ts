import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/cli",
    "remotion",
    "esbuild",
    "tsconfig-paths-webpack-plugin",
  ],
};

export default nextConfig;
