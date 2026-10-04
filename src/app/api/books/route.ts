import { NextResponse } from "next/server";
import { hasDb, getDb, getDbName } from "@/lib/db";
import { mapBook, stripImagesForList, validateBookPayload } from "@/lib/book-server";
import { isAdminRequest, isReviewEnabled } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * 市集书单：
 * - 默认返回「已上架（APPROVED）」的书籍
 * - 携带 owner=<deviceId> 时额外返回该设备自己的书（含待审核/已驳回），
 *   供「我的发布」展示；他人的未上架书不下发。
 */
export async function GET(req: Request) {
  if (!hasDb()) {
    // 未配置数据库 → 前端进入本地模式
    return NextResponse.json({ enabled: false, books: [] });
  }
  try {
    const owner = new URL(req.url).searchParams.get("owner")?.trim() || "";
    const db = getDb();
    const rows = await db.book.findMany({
      where: {
        OR: [
          { status: "APPROVED" },
          ...(owner ? [{ ownerId: owner }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      enabled: true,
      db: getDbName(),
      review: isReviewEnabled(),
      // 列表瘦身：多图书不下发图集（仅 imageCount），详情打开时按需拉取
      books: rows.map((r) => stripImagesForList(mapBook(r))),
    });
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
    // 审核策略：管理员发布直接上架；开启审核时新发布进入待审核队列
    const admin = await isAdminRequest();
    const reviewEnabled = isReviewEnabled();
    const status = admin || !reviewEnabled ? "APPROVED" : "PENDING";

    const db = getDb();
    const created = await db.book.create({
      data: {
        id: crypto.randomUUID(),
        ...parsed.data,
        originalPrice: parsed.data.originalPrice ?? null,
        status,
      },
    });
    return NextResponse.json({ book: mapBook(created) }, { status: 201 });
  } catch (e) {
    console.error("[books:POST]", e);
    return NextResponse.json({ error: "发布失败，请稍后重试" }, { status: 500 });
  }
}
