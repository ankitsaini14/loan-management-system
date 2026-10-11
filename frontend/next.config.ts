import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL?.trim() || "http://localhost:5050";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
