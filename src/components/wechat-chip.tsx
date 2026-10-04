"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/lib/image";

/** 摊位卡上的微信号胶囊：点击复制，便于买家直接添加书友 */
export function WechatChip({ wechat }: { wechat: string }) {
  const handleCopy = async () => {
    const ok = await copyText(wechat);
    if (ok) {
      toast.success("微信号已复制", { description: "去微信添加书友，聊聊心仪的书吧" });
    } else {
      toast.error("复制失败", { description: `微信号：${wechat}` });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white text-[13px] text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50 active:scale-[0.98]"
      aria-label={`复制卖家微信号 ${wechat}`}
    >
      <Copy className="h-3.5 w-3.5 text-stone-400" aria-hidden />
      微信号
      <span className="max-w-[160px] truncate rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-600">
        {wechat}
      </span>
      <span className="text-[11px] text-primary">点击复制</span>
    </button>
  );
}
