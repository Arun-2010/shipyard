import path from "node:path";
import type { NextConfig } from "next";

// All apps share one .env at the repo root (Next only looks in apps/web by default).
try {
  process.loadEnvFile(path.resolve(process.cwd(), "../../.env"));
} catch {
  // No .env file — rely on the real environment.
}

const nextConfig: NextConfig = {
  // packages/shared ships TypeScript source, so Next compiles it for us.
  transpilePackages: ["@shipyard/shared"],
};

export default nextConfig;
