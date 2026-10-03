/**
 * 旧实例（calm-darkness-39955293 / sweet-fire）残留清理：
 *   1. DROP SCHEMA shuji CASCADE          （neondb 库内书集旧表）
 *   2. DROP DATABASE "neon-shuji"         （迁移过程中创建的同名中间库）
 * 目标：将共享实例完整还原为 ilist 专属状态。ilist 数据（public 等 schema）不受影响。
 *
 * 前置条件：生产已验证运行于 frosty-rice 新实例，且数据已最终同步。
 * 用法：bun scripts/drop-old-shuji.ts
 */
import { Client } from "pg";
import { readFileSync } from "node:fs";

function loadEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const oldAdmin =
  env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL_UNPOOLED; // 旧实例直连（neondb）
if (!oldAdmin) throw new Error("未找到旧实例直连串");

async function main() {
  const c = new Client({ connectionString: oldAdmin });
  await c.connect();
  try {
    // 1. 删除书集旧 schema（neondb 内）
    await c.query(`DROP SCHEMA IF EXISTS shuji CASCADE`);
    console.log("✓ DROP SCHEMA shuji CASCADE");

    // 2. 删除迁移过程中在旧实例创建的中间库 neon-shuji
    const r = await c.query(`DROP DATABASE IF EXISTS "neon-shuji" WITH (FORCE)`);
    console.log("✓ DROP DATABASE neon-shuji", r.command);

    // 3. 校验：schema 列表与数据库列表
    const schemas = await c.query(
      `SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT LIKE 'neon%' ORDER BY 1`
    );
    const dbs = await c.query(
      `SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY 1`
    );
    console.log("剩余 schema:", schemas.rows.map((r) => r.nspname).join(", "));
    console.log("剩余数据库:", dbs.rows.map((r) => r.datname).join(", "));
    const hasShujiSchema = schemas.rows.some((r) => r.nspname === "shuji");
    const hasShujiDb = dbs.rows.some((r) => r.datname === "neon-shuji");
    if (hasShujiSchema || hasShujiDb) {
      throw new Error("残留未清理干净");
    }
    console.log("✅ 旧实例已还原干净（ilist 数据不受影响）");
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
