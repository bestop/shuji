"use client";

import { useEffect, useState } from "react";
import { ShareGuide } from "./share-guide";
import { consumeShareJump, isWeChat } from "@/lib/share";

/**
 * 落地页转发引导：
 * 从应用内点「分享」会整页跳转到 /book/[id]（微信原生转发固定取当前
 * 加载页的 URL，只有真正跳到落地页，转发出去的才是本书链接与卡片图）。
 * 跳转前通过 sessionStorage 打标记（URL 保持干净，「···」转发出去的
 * 不带 ?share=1 尾巴），本组件读到标记后自动弹出转发引导；
 * 兼容旧 ?share=1 参数。好友点开分享卡进来的普通访客两者皆无，不会看到引导。
 */
export function LandingShareGuide({
  cardUrl,
  bookId,
}: {
  cardUrl?: string;
  bookId?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isWeChat()) return;
    if (!consumeShareJump(bookId) && !/[?&]share=1/.test(window.location.search)) {
      return;
    }
    // 延迟一拍再弹出，避免 effect 内同步 setState（react-hooks 规则），
    // 也让用户先瞥见落地页内容、理解当前页面就是这本书
    const timer = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(timer);
  }, [bookId]);

  return <ShareGuide open={open} onClose={() => setOpen(false)} cardUrl={cardUrl} />;
}
