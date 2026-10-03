import { PrismaClient } from "@prisma/client";

/**
 * 数据库连接解析：
 *
 * 书集使用独立数据库 neon-shuji（2026-10-03 从共享实例的 neondb.shuji schema 迁出）。
 *
 * 环境变量优先级：
 * 1. SHUJI_DATABASE_URL   —— 显式指定新库连接串（本地 .env.local / 手动配置时使用）
 * 2. POSTGRES_PRISMA_URL  —— Vercel-Neon 集成注入的连接串（指向实例默认库 neondb），
 *                            运行时将其数据库名改写为 neon-shuji，
 *                            因此 Vercel 侧无需任何环境变量变更即可切到新库。
 * 3. DATABASE_URL         —— 兜底（同为 Neon 连接串时同样改写库名）
 *
 * 注：沙箱启动器可能预设 DATABASE_URL=file:...，非 postgres 协议的值一律忽略。
 */
const SHUJI_DB_NAME = "neon-shuji";

function rewriteDbName(url: string, dbName: string): string | undefined {
  if (!url.startsWith("postgres")) return undefined;
  try {
    const u = new URL(url);
    u.pathname = `/${dbName}`;
    return u.toString();
  } catch {
    return undefined;
  }
}

export function resolveDatabaseUrl(): string | undefined {
  const explicit = process.env.SHUJI_DATABASE_URL;
  if (explicit) return explicit;
  for (const fallback of [
    process.env.POSTGRES_PRISMA_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.DATABASE_URL,
  ]) {
    if (!fallback) continue;
    const rewritten = rewriteDbName(fallback, SHUJI_DB_NAME);
    if (rewritten) return rewritten;
  }
  return undefined;
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
  prismaUrl: string | undefined;
};

export function hasDb(): boolean {
  return Boolean(resolveDatabaseUrl());
}

export function getDb(): PrismaClient {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error("数据库连接串未配置（SHUJI_DATABASE_URL / POSTGRES_PRISMA_URL）");
  }
  // 惰性单例：连接串变化（本地改 .env.local 热切换环境）时重建客户端，
  // 避免开发期缓存的旧实例仍指向旧数据库。
  if (globalForPrisma.prisma && globalForPrisma.prismaUrl !== url) {
    void globalForPrisma.prisma.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ["error", "warn"],
      datasources: { db: { url } },
    });
    globalForPrisma.prismaUrl = url;
  }
  return globalForPrisma.prisma;
}
