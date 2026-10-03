import type { Book } from "@/lib/types";
import { formatPrice } from "@/lib/seed";

/** 是否运行在微信内置浏览器（WebView 不支持 navigator.share，需走引导转发） */
export function isWeChat(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

/**
 * 生成某本书的分享文案与落地链接。
 * 落地页 /book/[id] 带有独立的标题与分享卡片图，
 * 好友点开即可看到这本书，再跳回市集联系书友。
 */
export function buildBookShare(book: Book) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}/book/${book.id}`;
  const text = `【书集】《${book.title}》仅售 ¥${formatPrice(book.price)}，快来看看`;
  return { title: `书集 · ${book.title}`, text, url };
}
