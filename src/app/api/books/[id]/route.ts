import { NextResponse } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { mapBook } from "@/lib/book-server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 标记已售 / 重新上架（仅书籍所有者可操作） */
export async function PATCH(req: Request, { params }: Params) {
  if (!hasDb()) {
    return NextResponse.json({ error: "当前为本地模式" }, { status: 400 });
  }
  try {
    const { id } = await params;
    const body = (await req.json()) as { ownerId?: string; sold?: boolean };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId.trim() : "";
    const sold = Boolean(body.sold);

    const db = getDb();
    const book = await db.book.findUnique({ where: { id } });
    if (!book) {
      return NextResponse.json({ error: "书籍不存在或已被删除" }, { status: 404 });
    }
    if (book.ownerId !== ownerId || ownerId === "seed") {
      return NextResponse.json({ error: "只能管理自己发布的书籍" }, { status: 403 });
    }

    const updated = await db.book.update({ where: { id }, data: { sold } });
    return NextResponse.json({ book: mapBook(updated) });
  } catch (e) {
    console.error("[books:PATCH]", e);
    return NextResponse.json({ error: "操作失败，请稍后重试" }, { status: 500 });
  }
}

/** 删除书籍（仅书籍所有者可操作） */
export async function DELETE(req: Request, { params }: Params) {
  if (!hasDb()) {
    return NextResponse.json({ error: "当前为本地模式" }, { status: 400 });
  }
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const ownerId = url.searchParams.get("ownerId") ?? "";

    const db = getDb();
    const book = await db.book.findUnique({ where: { id } });
    if (!book) {
      return NextResponse.json({ ok: true });
    }
    if (book.ownerId !== ownerId || ownerId === "seed") {
      return NextResponse.json({ error: "只能删除自己发布的书籍" }, { status: 403 });
    }

    await db.book.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[books:DELETE]", e);
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}
