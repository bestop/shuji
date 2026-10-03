/**
 * 数据库切换状态综合核查：
 *   1. 新实例 frosty-rice 的 neon-shuji 库：连通性 + 数据概况
 *   2. 旧实例 sweet-fire：shuji 残留应全部清零
 *   3. 逻辑判定：生产若返回 12 本书且旧实例已无数据源 → 生产必然读自新实例
 * 用法：bun scripts/switch-status.ts
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
const NEW_URL = env.SHUJI_DATABASE_URL;
const OLD_URL = env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL_UNPOOLED;

async function main() {
  let newOk = false;
  let oldClean = false;

  // 1. 新实例
  if (NEW_URL) {
    const c = new Client({ connectionString: NEW_URL });
    await c.connect();
    try {
      const db = await c.query("SELECT current_database() AS db");
      const stat = await c.query(
        `SELECT count(*)::int AS total, count(*) FILTER (WHERE sold)::int AS sold,
                max("createdAt") AS latest FROM books`
      );
      const host = new URL(NEW_URL).hostname;
      newOk = db.rows[0].db === "neon-shuji" && stat.rows[0].total > 0;
      console.log(`【新实例 frosty-rice】${newOk ? "✅" : "❌"}`);
      console.log(`   端点: ${host}`);
      console.log(`   库: ${db.rows[0].db} | 书籍: ${stat.rows[0].total} 本（已售 ${stat.rows[0].sold}）`);
    } finally {
      await c.end();
    }
  }

  // 2. 旧实例残留检查
  if (OLD_URL) {
    const c = new Client({ connectionString: OLD_URL });
    await c.connect();
    try {
      const schemas = await c.query(
        `SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT LIKE 'neon%' ORDER BY 1`
      );
      const dbs = await c.query(
        `SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY 1`
      );
      const hasShujiSchema = schemas.rows.some((r) => r.nspname === "shuji");
      const hasShujiDb = dbs.rows.some((r) => r.datname === "neon-shuji");
      oldClean = !hasShujiSchema && !hasShujiDb;
      const host = new URL(OLD_URL).hostname;
      console.log(`【旧实例 sweet-fire】${oldClean ? "✅ 已还原干净" : "❌ 存在残留"}`);
      console.log(`   端点: ${host}`);
      console.log(`   schema: ${schemas.rows.map((r) => r.nspname).join(", ")}`);
      console.log(`   数据库: ${dbs.rows.map((r) => r.datname).join(", ")}`);
    } finally {
      await c.end();
    }
  }

  console.log(
    `\n判定：${newOk && oldClean ? "✅ 切换已完成 — 新实例承载数据，旧实例零残留" : "⚠️ 存在未完成项，见上方明细"}`
  );
  if (!newOk || !oldClean) process.exit(1);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
