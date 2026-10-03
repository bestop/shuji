"use client";

import { useState } from "react";
import {
  Copy,
  Heart,
  PackageCheck,
  RotateCcw,
  Share2,
  Tag,
  Trash2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { BookCover } from "./book-cover";
import { formatPrice, timeAgo } from "@/lib/seed";
import { copyText } from "@/lib/image";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleSold: (id: string) => void;
  onDelete: (id: string) => void;
};

export function DetailSheet({
  book,
  open,
  onOpenChange,
  isFavorite,
  onToggleFavorite,
  onToggleSold,
  onDelete,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!book) return null;
  const isMine = book.mine;

  const handleContact = async () => {
    const ok = await copyText(book.sellerWechat);
    if (ok) {
      toast.success("微信号已复制", {
        description: `去微信添加「${book.sellerName}」洽谈吧`,
      });
    } else {
      toast.error("复制失败", { description: `微信号：${book.sellerWechat}` });
    }
  };

  const handleShare = async () => {
    const text = `【书集】《${book.title}》仅售 ¥${formatPrice(book.price)}，点击查看`;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `书集 · ${book.title}`, text, url });
        return;
      } catch {
        /* 用户取消分享，忽略 */
      }
    }
    const ok = await copyText(`${text} ${url}`);
    toast[ok ? "success" : "error"](ok ? "分享内容已复制" : "分享失败");
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) setConfirmDelete(false); onOpenChange(o); }}>
      <DrawerContent className="mx-auto max-w-lg rounded-t-2xl">
        <div className="max-h-[86vh] overflow-y-auto overscroll-contain rounded-t-2xl">
          <DrawerTitle className="sr-only">《{book.title}》详情</DrawerTitle>

          {/* 封面 */}
          <div className="relative px-4 pt-3">
            <BookCover
              bookId={book.id}
              title={book.title}
              author={book.author}
              cover={book.cover}
              size="lg"
              className="aspect-[4/3] w-full rounded-xl shadow-sm"
            />
            {book.sold ? (
              <span className="absolute left-7 top-7 rotate-[-8deg] rounded-md border-2 border-white/90 bg-stone-950/30 px-3 py-1 font-serif-sc text-base font-bold tracking-[0.2em] text-white">
                已售出
              </span>
            ) : null}
          </div>

          <div className="space-y-4 px-5 pb-4 pt-4">
            {/* 价格与标题 */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-[#C2540A]">¥</span>
                <span className="text-3xl font-bold leading-none tracking-tight text-[#C2540A]">
                  {formatPrice(book.price)}
                </span>
                {book.originalPrice ? (
                  <span className="text-xs text-stone-400 line-through">
                    原价 ¥{formatPrice(book.originalPrice)}
                  </span>
                ) : null}
                <span className="ml-auto rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-600">
                  {book.condition}
                </span>
              </div>
              <h2 className="mt-2 font-serif-sc text-xl font-bold leading-snug text-stone-900">
                {book.title}
              </h2>
              <p className="mt-1 text-sm text-stone-500">{book.author}</p>
            </div>

            {/* 属性行 */}
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-stone-600">
                <Layers className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                分类 · {book.category}
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-stone-600">
                <Tag className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                {timeAgo(book.createdAt)}发布
              </div>
            </div>

            {/* 描述 */}
            <div>
              <h3 className="mb-1.5 text-[13px] font-semibold text-stone-700">宝贝描述</h3>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-stone-600">
                {book.description || "这位书友没有留下描述，可以直接联系 TA 了解详情。"}
              </p>
            </div>

            {/* 卖家卡片 */}
            <div className="flex items-center gap-3 rounded-xl border border-stone-200/70 bg-white p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {book.sellerName.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-800">{book.sellerName}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-400">
                  微信号
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-600">
                    {book.sellerWechat}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyText(book.sellerWechat);
                  toast[ok ? "success" : "error"](ok ? "微信号已复制" : "复制失败");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                aria-label="复制卖家微信号"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="sticky bottom-0 flex items-center gap-2.5 border-t border-stone-100 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
            {isMine ? (
              <>
                <button
                  type="button"
                  onClick={() => onToggleSold(book.id)}
                  className={cn(
                    "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition-colors",
                    book.sold
                      ? "border-stone-200 text-stone-600 hover:bg-stone-50"
                      : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                  )}
                >
                  {book.sold ? (
                    <><RotateCcw className="h-4 w-4" aria-hidden /> 重新上架</>
                  ) : (
                    <><PackageCheck className="h-4 w-4" aria-hidden /> 标记已售</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmDelete) {
                      setConfirmDelete(true);
                      setTimeout(() => setConfirmDelete(false), 3000);
                      return;
                    }
                    onDelete(book.id);
                    onOpenChange(false);
                    toast.success("已删除该书籍");
                  }}
                  className={cn(
                    "flex h-11 items-center justify-center gap-1.5 rounded-xl border px-4 text-sm font-semibold transition-colors",
                    confirmDelete
                      ? "border-destructive bg-destructive text-white"
                      : "border-stone-200 text-stone-500 hover:bg-stone-50"
                  )}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {confirmDelete ? "确认删除" : "删除"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onToggleFavorite(book.id);
                    toast[isFavorite ? "default" : "success"](
                      isFavorite ? "已取消收藏" : "已加入收藏"
                    );
                  }}
                  className={cn(
                    "flex h-11 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors",
                    isFavorite
                      ? "border-rose-200 bg-rose-50 text-rose-500"
                      : "border-stone-200 text-stone-500 hover:bg-stone-50"
                  )}
                  aria-label={isFavorite ? "取消收藏" : "收藏"}
                  aria-pressed={isFavorite}
                >
                  <Heart className={cn("h-5 w-5", isFavorite && "fill-rose-500")} />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50"
                  aria-label="分享"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleContact}
                  disabled={book.sold}
                  className={cn(
                    "flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white shadow-sm transition-all active:scale-[0.98]",
                    book.sold
                      ? "cursor-not-allowed bg-stone-300"
                      : "bg-primary hover:bg-primary/90"
                  )}
                >
                  {book.sold ? (
                    "本书已售出"
                  ) : (
                    <><Copy className="h-4 w-4" aria-hidden /> 微信联系卖家</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
