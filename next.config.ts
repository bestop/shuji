import type { NextConfig } from "next";

// Vercel 上使用标准构建输出；本地沙箱保留 standalone 便于直接启动
// 数据库：独立库 neon-shuji（连接解析见 src/lib/db.ts，Vercel 零配置适配）
const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // OG 卡片路由需在函数内读取中文字体文件
  outputFileTracingIncludes: {
    "/api/og/**": ["./public/fonts/**"],
  },
};

export default nextConfig;
