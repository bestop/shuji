/**
 * 「书集」数据迁移：neondb.shuji.books（旧，与 ilist 共享实例）
 *   → neon-shuji.public.books（新，书集独立数据库）
 *
 * - 迁移前先将旧库全部数据备份为 JSON（download/ 目录）
 * - 幂等：按 id upsert（ON CONFLICT DO UPDATE）
 *   · 上线切换前重跑：以旧库为准覆盖新库（吸收切换窗口期在旧库产生的新增/编辑）
 *   · 上线切换后不要再跑：新库才是唯一事实源
 *
 * 用法：bun scripts/migrate-to-neon-shuji.ts
 */
import { Client } from "pg";
import { readFileSync, writeFileSync } from "node:fs";

const OLD_SCHEMA = "shuji";

function loadEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };

const oldUrl = env.POSTGRES_PRISMA_URL || env.DATABASE_URL; // 指向旧库 neondb
const newUrl = env.SHUJI_DATABASE_URL; // 指向新库 neon-shuji
if (!oldUrl) throw new Error("未找到旧库连接串（POSTGRES_PRISMA_URL）");
if (!newUrl) throw new Error("未找到新库连接串（SHUJI_DATABASE_URL）");

function withDb(u: string, db: string) {
  const x = new URL(u);
  x.pathname = `/${db}`;
  return x.toString();
}

const RESERVE = new Set(["user", "select", "order", "group", "where"]);
function q(ident: string) {
  return `"${ident}"`;
}

async function main() {
  const old = new Client({ connectionString: oldUrl });
  const neu = new Client({ connectionString: newUrl });
  await old.connect();
  await neu.connect();

  try {
    // 1. 读取旧库数据
    const src = await old.query(`SELECT * FROM ${q(OLD_SCHEMA)}.books ORDER BY "createdAt"`);
    const rows = src.rows;
    console.log(`旧库 ${OLD_SCHEMA}.books 读取 ${rows.length} 行`);

    // 2. 备份 JSON
    const backup = {
      exportedAt: new Date().toISOString(),
      source: `neondb.${OLD_SCHEMA}.books`,
      target: "neon-shuji.public.books",
      count: rows.length,
      rows,
    };
    const backupPath = `/home/z/my-project/download/shuji-books-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`备份完成: ${backupPath}`);

    if (rows.length === 0) {
      console.log("旧库无数据，无需迁移");
      return;
    }

    // 3. 逐行 upsert 到新库
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      const cols = Object.keys(row).filter((k) => !k.includes("."));
      const colSql = cols.map((c) => q(c)).join(", ");
      const idx = cols.map((_, i) => `$${i + 1}`).join(", ");
      const sets = cols
        .filter((c) => c !== "id")
        .map((c) => `${q(c)} = EXCLUDED.${q(c)}`)
        .join(", ");
      const values = cols.map((c) => row[c]);
      const sql = `INSERT INTO books (${colSql}) VALUES (${idx})
        ON CONFLICT (id) DO UPDATE SET ${sets}
        RETURNING (xmax = 0) AS inserted`;
      const r = await neu.query(sql, values);
      if (r.rows[0]?.inserted) inserted++;
      else updated++;
    }
    console.log(`迁移完成: 新增 ${inserted} 行，覆盖 ${updated} 行`);

    // 4. 校验
    const cnt = await neu.query(
      `SELECT count(*)::int AS n, count(*) FILTER (WHERE sold)::int AS sold FROM books`
    );
    const dup = await neu.query(`SELECT count(DISTINCT id)::int AS n FROM books`);
    console.log(
      `新库校验: 共 ${cnt.rows[0].n} 本（其中已售 ${cnt.rows[0].sold} 本），唯一 id ${dup.rows[0].n} 个`
    );
    if (Number(cnt.rows[0].n) !== rows.length) {
      throw new Error(`迁移行数不一致！旧 ${rows.length} vs 新 ${cnt.rows[0].n}`);
    }
    console.log("✅ 行数校验一致");
  } finally {
    await old.end();
    await neu.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
