import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "bullmq", "ioredis"],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
