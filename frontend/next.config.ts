import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp là native module -> để Next nạp trực tiếp ở server, không bundle vào route.
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
