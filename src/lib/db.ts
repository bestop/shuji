import { PrismaClient } from "@prisma/client";

/**
 * 惰性单例 Prisma 客户端：
 * 未配置 POSTGRES_PRISMA_URL 时绝不实例化，保证「本地模式」下
 * 应用与构建流程零数据库依赖。
 * 注：沙箱启动器会预设 DATABASE_URL=file:...，因此应用统一使用
 * Vercel 集成提供的 POSTGRES_PRISMA_URL 变量。
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function hasDb(): boolean {
  return Boolean(process.env.POSTGRES_PRISMA_URL);
}

export function getDb(): PrismaClient {
  const url = process.env.POSTGRES_PRISMA_URL;
  if (!url) {
    throw new Error("POSTGRES_PRISMA_URL is not configured");
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ["error", "warn"],
      datasources: { db: { url } },
    });
  }
  return globalForPrisma.prisma;
}
