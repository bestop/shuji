/**
 * 在现有 Neon 实例（calm-darkness-39955293）上创建独立数据库 neon-shuji，
 * 与 ilist 项目使用的 neondb 实现数据库级隔离。
 *
 * - 连接串读取自 .env.local（Vercel env pull 产物）
 * - DDL 必须走直连（非 pooler）端点：DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING
 * - 幂等：已存在则跳过
 *
 * 用法：bun scripts/create-neon-shuji.ts
 */
import { Client } from "pg";
import { readFileSync } from "node:fs";

const DB_NAME = "neon-shuji";

function loadEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const adminUrl =
  process.env.SHUJI_ADMIN_URL || // 显式指定目标实例（跨实例操作时使用）
  env.POSTGRES_URL_NON_POOLING ||
  env.DATABASE_URL_UNPOOLED;
if (!adminUrl) throw new Error("未找到直连连接串（SHUJI_ADMIN_URL / POSTGRES_URL_NON_POOLING）");

function mask(u: string) {
  return u.replace(/\/\/([^:/@]+):[^@/]+@/, "//$1:****@");
}

async function main() {
  // 1. 连接到已有库 neondb 检查目标库是否存在
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const exists = await admin.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME]
    );
    if (exists.rowCount && exists.rowCount > 0) {
      console.log(`数据库 ${DB_NAME} 已存在，跳过创建`);
      return;
    }
    // 2. CREATE DATABASE 不能在事务内执行 —— pg 单条语句自动提交，直接执行
    await admin.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`数据库 ${DB_NAME} 创建成功`);
  } finally {
    await admin.end();
  }

  // 3. 验证新库可连接
  const u = new URL(adminUrl);
  u.pathname = `/${DB_NAME}`;
  const check = new Client({ connectionString: u.toString() });
  await check.connect();
  try {
    const r = await check.query("SELECT current_database(), version()");
    console.log(
      `新库连接验证通过: ${r.rows[0].current_database} @ ${mask(adminUrl).split("@")[1]?.split("/")[0]}`
    );
  } finally {
    await check.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
