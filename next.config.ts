import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["nodemailer", "node-cron"],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
