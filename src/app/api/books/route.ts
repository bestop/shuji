import { NextResponse } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { mapBook, validateBookPayload } from "@/lib/book-server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) {
    // 未配置数据库 → 前端进入本地模式
    return NextResponse.json({ enabled: false, books: [] });
  }
  try {
    const db = getDb();
    const rows = await db.book.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ enabled: true, books: rows.map(mapBook) });
  } catch (e) {
    console.error("[books:GET]", e);
    return NextResponse.json(
      { enabled: true, books: [], error: "数据库暂时不可用" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!hasDb()) {
    return NextResponse.json({ error: "当前为本地模式，未连接云端数据库" }, { status: 400 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = validateBookPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const db = getDb();
    const created = await db.book.create({
      data: {
        id: crypto.randomUUID(),
        ...parsed.data,
        originalPrice: parsed.data.originalPrice ?? null,
      },
    });
    return NextResponse.json({ book: mapBook(created) }, { status: 201 });
  } catch (e) {
    console.error("[books:POST]", e);
    return NextResponse.json({ error: "发布失败，请稍后重试" }, { status: 500 });
  }
}
