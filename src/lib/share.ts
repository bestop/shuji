import type { Book } from "@/lib/types";
import { formatPrice } from "@/lib/seed";

/** 是否运行在微信内置浏览器（WebView 不支持 navigator.share，需走引导转发） */
export function isWeChat(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

/**
 * 「应用内点分享 → 整页跳落地页」的会话标记。
 * 用 sessionStorage 而非 URL 参数：跳转 URL 保持干净的 /book/{id}，
 * 微信「···」转发出去的链接不带 ?share=1 尾巴。
 */
const SHARE_JUMP_FLAG = "ys:share-jump";

/** 跳转前打标记（同一 WebView 标签页内跨页面可见） */
export function markShareJump(bookId: string): void {
  try {
    sessionStorage.setItem(SHARE_JUMP_FLAG, bookId);
  } catch {
    /* 隐私模式等场景下静默降级：仅少了自动引导，功能不受影响 */
  }
}

/**
 * 落地页消费标记：仅当标记指向本书时视为「应用内分享跳转而来」。
 * 读取成功即清除，避免刷新/回退时重复弹出引导。
 */
export function consumeShareJump(bookId?: string): boolean {
  try {
    const flagged = sessionStorage.getItem(SHARE_JUMP_FLAG);
    if (!flagged) return false;
    if (bookId && flagged !== bookId) return false;
    sessionStorage.removeItem(SHARE_JUMP_FLAG);
    return true;
  } catch {
    return false;
  }
}

/**
 * 生成某本书的分享文案与落地链接。
 * 落地页 /book/[id] 带有独立的标题与分享卡片图，
 * 好友点开即可看到这本书，再跳回市集联系书友。
 */
export function buildBookShare(book: Book) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}/book/${book.id}`;
  const text = `【易书】《${book.title}》仅售 ¥${formatPrice(book.price)}${
    book.freeShipping ? "（包邮）" : ""
  }，快来看看`;
  return { title: `易书 · ${book.title}`, text, url };
}
