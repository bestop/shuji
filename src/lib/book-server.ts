import type { Book, BookStatus } from "@/lib/types";
import { CONDITIONS } from "@/lib/types";

const VALID_STATUS: BookStatus[] = ["PENDING", "APPROVED", "REJECTED"];

/** 将数据库行映射为前端 Book 类型（时间戳转为 ms） */
export function mapBook(b: {
  id: string;
  title: string;
  author: string;
  category: string;
  condition: string;
  price: number;
  originalPrice: number | null;
  freeShipping: boolean;
  description: string;
  cover: string | null;
  sellerName: string;
  sellerWechat: string;
  ownerId: string;
  sold: boolean;
  status: string;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}): Book {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    category: b.category,
    condition: b.condition as Book["condition"],
    price: b.price,
    originalPrice: b.originalPrice ?? undefined,
    freeShipping: b.freeShipping,
    description: b.description,
    cover: b.cover ?? undefined,
    sellerName: b.sellerName,
    sellerWechat: b.sellerWechat,
    ownerId: b.ownerId,
    sold: b.sold,
    status: VALID_STATUS.includes(b.status as BookStatus)
      ? (b.status as BookStatus)
      : "APPROVED",
    reviewNote: b.reviewNote ?? undefined,
    reviewedAt: b.reviewedAt ? b.reviewedAt.getTime() : undefined,
    createdAt: b.createdAt.getTime(),
  };
}

export function validateBookPayload(body: Record<string, unknown>):
  | { ok: true; data: {
      title: string; author: string; category: string; condition: string;
      price: number; originalPrice?: number; freeShipping: boolean; description: string;
      cover?: string; sellerName: string; sellerWechat: string; ownerId: string;
    } }
  | { ok: false; error: string } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const title = str(body.title);
  const author = str(body.author) || "佚名";
  const category = str(body.category);
  const condition = str(body.condition);
  const description = str(body.description).slice(0, 500);
  const sellerName = str(body.sellerName);
  const sellerWechat = str(body.sellerWechat);
  const ownerId = str(body.ownerId);
  const cover = str(body.cover) || undefined;
  const price = Number(body.price);
  const originalPriceRaw = body.originalPrice;
  const freeShipping =
    body.freeShipping === true ||
    body.freeShipping === "true" ||
    body.freeShipping === 1;

  if (!title || title.length > 60) return { ok: false, error: "书名不能为空且不超过 60 字" };
  if (!Number.isFinite(price) || price <= 0 || price > 99999)
    return { ok: false, error: "价格不正确" };
  if (originalPriceRaw !== undefined && originalPriceRaw !== null && originalPriceRaw !== "") {
    const op = Number(originalPriceRaw);
    if (!Number.isFinite(op) || op < 0) return { ok: false, error: "原价不正确" };
  }
  if (!(CONDITIONS as readonly string[]).includes(condition))
    return { ok: false, error: "成色不正确" };
  if (!category) return { ok: false, error: "请选择分类" };
  if (!sellerName || !sellerWechat) return { ok: false, error: "请填写卖家昵称与微信号" };
  if (!ownerId) return { ok: false, error: "缺少设备标识" };
  if (cover && cover.length > 500_000) return { ok: false, error: "封面图片过大" };

  return {
    ok: true,
    data: {
      title,
      author,
      category,
      condition,
      price: Math.round(price * 100) / 100,
      originalPrice:
        originalPriceRaw !== undefined && originalPriceRaw !== null && originalPriceRaw !== ""
          ? Math.round(Number(originalPriceRaw) * 100) / 100
          : undefined,
      freeShipping,
      description,
      cover,
      sellerName,
      sellerWechat,
      ownerId,
    },
  };
}
