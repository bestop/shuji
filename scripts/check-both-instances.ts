/**
 * 双实例对照验证：确认某本书只存在于预期实例的 neon-shuji 库。
 * 用法：bun scripts/check-both-instances.ts "<书名>"
 *   读取 .env.local：SHUJI_DATABASE_URL（新实例）/ POSTGRES_PRISMA_URL（旧实例）
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
const title = process.argv[2] ?? "__验证书__";

async function exists(url: string, db: string, t: string): Promise<boolean> {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    const r = await c.query(
      `SELECT count(*)::int AS n FROM books WHERE title = $1`,
      [t]
    );
    return r.rows[0].n > 0;
  } finally {
    await c.end();
  }
}

async function main() {
  const inNew = await exists(env.SHUJI_DATABASE_URL, "neon-shuji", title);
  const inOld = await exists(
    env.POSTGRES_PRISMA_URL.replace(/\/neondb\?/, "/neon-shuji?"),
    "neon-shuji",
    title
  );
  console.log(`书名「${title}」`);
  console.log(`  frosty-rice 新实例 → 存在: ${inNew}`);
  console.log(`  sweet-fire 旧实例 → 存在: ${inOld}`);
  if (inNew && !inOld) console.log("✅ 写入落点确认：生产已连接 frosty-rice 新实例");
  else if (!inNew && inOld) console.log("⚠️ 仍连接旧实例！");
  else console.log("❓ 结果异常，请人工检查");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
