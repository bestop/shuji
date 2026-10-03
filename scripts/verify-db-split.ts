/**
 * 校验新库写入落点：测试书应存在于 neon-shuji.public.books，
 * 且旧库 neondb.shuji.books 不受影响（仍为迁移时行数）。
 * 用法：bun scripts/verify-db-split.ts
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

async function count(url: string, table: string): Promise<number> {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    const r = await c.query(`SELECT count(*)::int AS n FROM ${table}`);
    return r.rows[0].n;
  } finally {
    await c.end();
  }
}

async function main() {
  const testInNew = await count(env.SHUJI_DATABASE_URL, 'books WHERE title = \'__迁移测试书__\'');
  const totalNew = await count(env.SHUJI_DATABASE_URL, "books");
  const totalOld = await count(env.POSTGRES_PRISMA_URL, "shuji.books");
  console.log(`新库 neon-shuji: 总数=${totalNew}, 测试书存在=${testInNew === 1}`);
  console.log(`旧库 neondb.shuji.books: 总数=${totalOld}（应保持 12，未被写入）`);
  if (testInNew !== 1 || totalOld !== 12) {
    console.error("❌ 校验不通过");
    process.exit(1);
  }
  console.log("✅ 写入落点校验通过：新写入只进 neon-shuji");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
