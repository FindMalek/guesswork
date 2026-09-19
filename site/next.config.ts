import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives in a subdirectory of the guesswork monorepo, which has its
  // own package-lock.json at the repo root; pin the workspace root to this
  // directory so Turbopack doesn't try to guess it.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
