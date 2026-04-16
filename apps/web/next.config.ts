import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["tamagui", "@tamagui/config", "@tamagui/font-inter", "@tamagui/themes"],
  turbopack: {
    // Pin the Turbopack root to the monorepo root (where package-lock.json
    // lives) so `next`, `react`, and other hoisted deps resolve correctly.
    // Without this, Turbopack infers `apps/web/app` and can't find them.
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
