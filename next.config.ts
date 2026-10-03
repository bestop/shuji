import type { NextConfig } from "next";

// Vercel 上使用标准构建输出；本地沙箱保留 standalone 便于直接启动
const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
