"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, BookOpen } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * 微信内分享引导浮层：
 * 微信 WebView 不提供 Web Share API，也无公众号 JS-SDK 配置，
 * 标准做法是引导用户点击右上角「···」使用原生转发。
 */
export function ShareGuide({ open, onClose }: Props) {
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

          {/* 中央说明卡片 */}
          <div className="absolute left-1/2 top-1/2 w-[80%] max-w-xs -translate-x-1/2 -translate-y-1/2">
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.22 }}
              className="rounded-2xl bg-white p-6 text-center shadow-2xl"
            >
              <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <p className="text-[15px] font-semibold text-stone-800">
                点击右上角「···」菜单
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-stone-500">
                选择「转发给朋友」或「分享到朋友圈」
              </p>
              <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-400">
                分享文案已复制，也可以直接粘贴给好友
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
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
