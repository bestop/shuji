import { PrismaClient } from "@prisma/client";

/**
 * 数据库连接（2026-10-03 全面直连独立实例）：
 *
 * - SHUJI_DATABASE_URL —— 池化连接串，运行时读写（本地 .env.local / Vercel 环境变量）
 * - SHUJI_DIRECT_URL   —— 直连连接串，仅供 prisma db push / migrate 使用（见 schema.prisma）
 *
 * 旧共享实例（sweet-fire）的存储挂载已断开，POSTGRES_* / DATABASE_URL 等
 * 注入变量已移除；应用只认 SHUJI_*，不再做库名改写或回退解析。
 */
export function resolveDatabaseUrl(): string | undefined {
  const url = process.env.SHUJI_DATABASE_URL;
  return url && url.startsWith("postgres") ? url : undefined;
}

/** 当前实际使用的数据库名（用于 API 响应中透明展示，不含敏感信息） */
export function getDbName(): string | undefined {
  const url = resolveDatabaseUrl();
  if (!url) return undefined;
  try {
    return new URL(url).pathname.replace(/^\//, "") || undefined;
  } catch {
    return undefined;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function hasDb(): boolean {
  return Boolean(resolveDatabaseUrl());
}

export function getDb(): PrismaClient {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error("数据库连接串未配置（SHUJI_DATABASE_URL）");
  }
  // 惰性单例：同一进程内复用连接
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ["error", "warn"],
      datasources: { db: { url } },
    });
  }
  return globalForPrisma.prisma;
}
