import { NextResponse } from "next/server";
import { hasDb, getDb, getDbName } from "@/lib/db";
import { mapBook } from "@/lib/book-server";
import { isAdminRequest } from "@/lib/admin";
import type { BookStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 全量书单（管理员专用）：含待审核/已驳回书籍与状态计数 */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (!hasDb()) {
    return NextResponse.json({ error: "未连接数据库" }, { status: 400 });
  }
  try {
    const db = getDb();
    const rows = await db.book.findMany({ orderBy: { createdAt: "desc" } });
    const books = rows.map(mapBook);
    const counts: Record<BookStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    for (const b of books) counts[b.status] += 1;
    return NextResponse.json({ db: getDbName(), books, counts });
  } catch (e) {
    console.error("[admin:books:GET]", e);
    return NextResponse.json({ error: "数据库暂时不可用" }, { status: 500 });
  }
}
