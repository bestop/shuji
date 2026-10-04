"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, BookOpen } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** 书籍分享卡图（传入后浮层内直接展示，微信内长按即可发送/保存/识别二维码） */
  cardUrl?: string;
};

/**
 * 微信内分享引导浮层：
 * 微信 WebView 不提供 Web Share API，也无公众号 JS-SDK 配置，
 * 两条转发路径：① 长按下方卡片图 → 原生菜单「发送给朋友」（图片直发）；
 * ② 点右上角「···」→「转发给朋友」（本书链接卡）。
 */
export function ShareGuide({ open, onClose, cardUrl }: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="share-guide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] bg-stone-950/80 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="分享引导"
        >
          {/* 右上角菜单提示圈 + 跳动箭头 */}
          <div className="absolute right-3 top-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-white/70">
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              className="text-white"
            >
              <ArrowUpRight className="h-7 w-7" aria-hidden />
            </motion.div>
          </div>

          {/* 中央说明卡片（点击内部不关闭，仅点遮罩或按钮关闭） */}
          <div className="absolute left-1/2 top-1/2 w-[84%] max-w-sm -translate-x-1/2 -translate-y-1/2">
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[76vh] overflow-y-auto rounded-2xl bg-white p-5 text-center shadow-2xl"
            >
              <span className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <p className="text-[15px] font-semibold text-stone-800">
                把这本书转发给朋友
              </p>

              {cardUrl ? (
                <>
                  <img
                    src={cardUrl}
                    alt="本书分享卡片"
                    className="mt-3 w-full rounded-xl border border-stone-200/70 shadow-sm"
                  />
                  <p className="mt-2.5 rounded-lg bg-primary/5 px-3 py-2 text-[13px] leading-relaxed text-stone-600">
                    <span className="font-semibold text-primary">长按上方卡片图</span>
                    ：可直接「发送给朋友」、保存图片，或识别二维码直达本书
                  </p>
                </>
              ) : null}

              <p className="mt-2.5 text-xs leading-relaxed text-stone-500">
                也可以点右上角「···」→「转发给朋友」，发送本书链接
              </p>
              <p className="mt-1.5 rounded-lg bg-stone-50 px-3 py-1.5 text-xs text-stone-400">
                分享文案已复制，也可以直接粘贴给好友
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3.5 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                我知道了
              </button>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
