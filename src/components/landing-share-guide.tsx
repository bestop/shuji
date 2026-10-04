"use client";

import { useEffect, useState } from "react";
import { ShareGuide } from "./share-guide";
import { isWeChat } from "@/lib/share";

/**
 * 落地页转发引导：
 * 从应用内点「分享」会整页跳转到 /book/[id]?share=1（微信原生转发
 * 固定取当前加载页的 URL，只有真正跳到落地页，转发出去的才是本书
 * 链接与书籍卡片图）。本组件在落地页加载后自动弹出「···」转发引导。
 * 好友点开分享卡进来的普通访客不带该参数，不会看到引导。
 */
export function LandingShareGuide({ cardUrl }: { cardUrl?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // 仅「应用内点分享跳转而来」的访客（?share=1 且微信内）自动弹出；
    // 好友点开分享卡进来的普通访客不带该参数，绝不打扰
    if (!isWeChat()) return;
    if (!/[?&]share=1/.test(window.location.search)) return;
    // 延迟一拍再弹出，避免 effect 内同步 setState（react-hooks 规则），
    // 也让用户先瞥见落地页内容、理解当前页面就是这本书
    const timer = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  return <ShareGuide open={open} onClose={() => setOpen(false)} cardUrl={cardUrl} />;
}
