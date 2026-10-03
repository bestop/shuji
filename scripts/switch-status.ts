/**
 * 易书数据库健康巡检（独立实例 frosty-rice / neon-shuji）：
 *   1. SHUJI_DATABASE_URL 连通性 + 当前库名
 *   2. 书籍总量 / 已售 / 审核状态分布
 * 用法：bun scripts/switch-status.ts
 */
import { Client } from "pg";
import { readFileSync } from "node:fs";

function loadEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (m) out[m[1]] = m[2];
    }
  } catch {
    /* 文件不存在则忽略 */
  }
  return out;
}

const env = { ...process.env, ...loadEnvFile(".env.local") };
const URL_ = env.SHUJI_DATABASE_URL;

async function main() {
  if (!URL_?.startsWith("postgres")) {
    console.error("❌ 未找到 SHUJI_DATABASE_URL（检查 .env.local）");
    process.exit(1);
  }
  const host = new URL(URL_).hostname;
  const c = new Client({ connectionString: URL_ });
  await c.connect();
  try {
    const db = await c.query("SELECT current_database() AS db");
    const stat = await c.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE sold)::int AS sold,
              count(*) FILTER (WHERE status = 'PENDING')::int AS pending,
              count(*) FILTER (WHERE status = 'APPROVED')::int AS approved,
              count(*) FILTER (WHERE status = 'REJECTED')::int AS rejected,
              max("createdAt") AS latest
       FROM books`
    );
    const s = stat.rows[0];
    const ok = db.rows[0].db === "neon-shuji" && s.total > 0;
    console.log(`【neon-shuji 实例巡检】${ok ? "✅" : "⚠️"}`);
    console.log(`   端点: ${host}`);
    console.log(`   库: ${db.rows[0].db}`);
    console.log(
      `   书籍: ${s.total} 本（已售 ${s.sold}）| 审核: 待审 ${s.pending} / 已过 ${s.approved} / 驳回 ${s.rejected}`
    );
    console.log(`   最新发布: ${s.latest ? new Date(s.latest).toLocaleString("zh-CN") : "-"}`);
    if (!ok) process.exit(1);
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error("❌ 巡检失败:", e.message ?? e);
  process.exit(1);
});
