import { NextResponse } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { mapBook } from "@/lib/book-server";
import { isAdminRequest } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 审核操作（管理员专用）：通过上架 / 驳回下架（可附原因） */
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (!hasDb()) {
    return NextResponse.json({ error: "未连接数据库" }, { status: 400 });
  }
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      action?: unknown;
      note?: unknown;
    };
    const action = body.action === "approve" || body.action === "reject" ? body.action : "";
    if (!action) {
      return NextResponse.json({ error: "操作不合法" }, { status: 400 });
    }
    const note =
      typeof body.note === "string" ? body.note.trim().slice(0, 100) : "";

    const db = getDb();
    const book = await db.book.findUnique({ where: { id } });
    if (!book) {
      return NextResponse.json({ error: "书籍不存在或已被删除" }, { status: 404 });
    }

    const updated = await db.book.update({
      where: { id },
      data:
        action === "approve"
          ? { status: "APPROVED", reviewedAt: new Date(), reviewNote: null }
          : { status: "REJECTED", reviewedAt: new Date(), reviewNote: note || null },
    });
    return NextResponse.json({ book: mapBook(updated) });
  } catch (e) {
    console.error("[admin:books:PATCH]", e);
    return NextResponse.json({ error: "操作失败，请稍后重试" }, { status: 500 });
  }
}
