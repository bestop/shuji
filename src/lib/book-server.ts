import type { Book, BookStatus } from "@/lib/types";
import { CONDITIONS } from "@/lib/types";
import {
  MAX_BOOK_IMAGES,
  MAX_IMAGE_DATAURL_LENGTH,
  toGallery,
} from "@/lib/utils";

const VALID_STATUS: BookStatus[] = ["PENDING", "APPROVED", "REJECTED"];

/**
 * 解析 DB images(Json) → 附加图字符串数组（不含封面）。
 * 防御性校验：仅接受 data:image/ 开头的字符串，单张限长，最多 5 张（加封面合计 6 张）。
 */
export function parseExtraImages(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (s): s is string =>
        typeof s === "string" &&
        s.startsWith("data:image/") &&
        s.length <= MAX_IMAGE_DATAURL_LENGTH
    )
    .slice(0, MAX_BOOK_IMAGES - 1);
}

/** 将数据库行映射为前端 Book 类型（时间戳转为 ms；图集合并为完整列表） */
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
  images?: unknown;
  sellerName: string;
  sellerWechat: string;
  ownerId: string;
  sold: boolean;
  status: string;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}): Book {
  const gallery = toGallery(b.cover ?? undefined, parseExtraImages(b.images));
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
    images: gallery,
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

/**
 * 列表下发瘦身：多图书剥离图集，仅保留 imageCount 提示张数；
 * 详情弹层打开时按需 GET /api/books/[id] 拉取，避免书单响应膨胀到 MB 级。
 */
export function stripImagesForList(b: Book): Book {
  if (!b.images || b.images.length <= 1) return b;
  return { ...b, images: undefined, imageCount: b.images.length };
}

export function validateBookPayload(body: Record<string, unknown>):
  | { ok: true; data: {
      title: string; author: string; category: string; condition: string;
      price: number; originalPrice?: number; freeShipping: boolean; description: string;
      cover?: string; images?: string[]; sellerName: string; sellerWechat: string; ownerId: string;
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

  // 附加实拍图：不含封面，最多 5 张（加封面合计 6 张），逐张校验类型与大小
  const images: string[] = [];
  if (body.images !== undefined && body.images !== null) {
    if (!Array.isArray(body.images))
      return { ok: false, error: "图片格式不正确" };
    for (const item of body.images) {
      if (typeof item !== "string" || !item.startsWith("data:image/"))
        return { ok: false, error: "图片格式不正确" };
      if (item.length > MAX_IMAGE_DATAURL_LENGTH)
        return { ok: false, error: "单张图片过大，请重新选择" };
      images.push(item);
    }
    if (images.length > MAX_BOOK_IMAGES - 1)
      return { ok: false, error: "图片最多 6 张（含封面）" };
  }

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
  if (cover && cover.length > MAX_IMAGE_DATAURL_LENGTH)
    return { ok: false, error: "封面图片过大" };

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
      images: images.length ? images : undefined,
      sellerName,
      sellerWechat,
      ownerId,
    },
  };
}
