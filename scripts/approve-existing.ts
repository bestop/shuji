/**
 * 一次性迁移助手：管理员审核功能上线前，将全部存量书籍放行为 APPROVED。
 * 审核字段刚加入时列默认值为 PENDING，存量书需显式放行。
 * 幂等：仅更新 status='PENDING' 且从未被审核过的行。
 * 用法：bun scripts/approve-existing.ts
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
    /* ignore */
  }
  return out;
}

const merged = { ...loadEnvFile(".env.local"), ...process.env };
const url = merged.SHUJI_DIRECT_URL; // DDL/批量更新走直连端点
if (!url?.startsWith("postgres")) throw new Error("未找到 SHUJI_DIRECT_URL");

const c = new Client({ connectionString: url });
await c.connect();
try {
  const before = await c.query(
    `SELECT status, count(*)::int AS n FROM books GROUP BY status ORDER BY status`
  );
  console.log("更新前分布:", before.rows.map((r) => `${r.status}=${r.n}`).join(", ") || "(空表)");

  const res = await c.query(
    `UPDATE books SET status = 'APPROVED', "reviewedAt" = now()
     WHERE status = 'PENDING' AND "reviewedAt" IS NULL`
  );
  console.log(`已放行 ${res.rowCount} 本存量书籍 → APPROVED`);

  const after = await c.query(
    `SELECT status, count(*)::int AS n FROM books GROUP BY status ORDER BY status`
  );
  console.log("更新后分布:", after.rows.map((r) => `${r.status}=${r.n}`).join(", ") || "(空表)");
} finally {
  await c.end();
}
