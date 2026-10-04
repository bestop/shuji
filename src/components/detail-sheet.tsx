"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Heart,
  PackageCheck,
  RotateCcw,
  Share2,
  Tag,
  Trash2,
  Layers,
  Clock3,
  ChevronRight,
  Truck,
  ShieldAlert,
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
import { buildBookShare, isWeChat, markShareJump } from "@/lib/share";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 是否为当前设备发布的书籍 */
  isMine: boolean;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleSold: (id: string, nextSold: boolean) => void;
  onDelete: (id: string) => void;
};

export function DetailSheet({
  book,
  open,
  onOpenChange,
  isMine,
  isFavorite,
  onToggleFavorite,
  onToggleSold,
  onDelete,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!book) return null;

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
    const { title, text, url } = buildBookShare(book);

    // 微信 WebView 的「···」原生转发固定取当前加载页的 URL：
    // 详情只是首页上的弹层、URL 不变，直接引导转发出去的永远是首页链接。
    // 因此先复制文案兜底，再整页跳到带独立标题/分享卡的落地页：
    // 用 sessionStorage 打标记触发引导（而非 URL 参数），
    // 这样落地页 URL 保持干净，转发出去的才是纯 /book/{id} 链接。
    if (isWeChat()) {
      await copyText(`${text} ${url}`);
      markShareJump(book.id);
      window.location.href = url;
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return; // 用户取消
      }
    }
    const ok = await copyText(`${text} ${url}`);
    toast[ok ? "success" : "error"](
      ok ? "分享内容已复制，去粘贴给好友吧" : "分享失败"
    );
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
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
                <span className="text-lg font-bold text-[#C2540A]">¥</span>
                <span className="text-3xl font-bold leading-none tracking-tight text-[#C2540A]">
                  {formatPrice(book.price)}
                </span>
                {book.originalPrice ? (
                  <span className="text-xs text-stone-400 line-through">
                    原价 ¥{formatPrice(book.originalPrice)}
                  </span>
                ) : null}
                <div className="ml-auto flex items-center gap-1.5">
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]",
                      book.freeShipping
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-stone-100 text-stone-500"
                    )}
                  >
                    <Truck className="h-3 w-3" aria-hidden />
                    {book.freeShipping ? "包邮" : "运费自付"}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-600">
                    {book.condition}
                  </span>
                </div>
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

            {/* 自己的待审核/未通过书提示（市集里看不到，仅自己可见） */}
            {isMine && book.status !== "APPROVED" ? (
              <div
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border p-3.5",
                  book.status === "PENDING"
                    ? "border-amber-200/80 bg-amber-50"
                    : "border-destructive/30 bg-destructive/5"
                )}
              >
                {book.status === "PENDING" ? (
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                ) : (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-[13px] font-semibold",
                      book.status === "PENDING" ? "text-amber-800" : "text-destructive"
                    )}
                  >
                    {book.status === "PENDING" ? "审核中" : "未通过审核"}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs leading-relaxed",
                      book.status === "PENDING" ? "text-amber-700/90" : "text-destructive/80"
                    )}
                  >
                    {book.status === "PENDING"
                      ? "管理员确认后会出现在市集，无需重复发布"
                      : book.reviewNote ||
                        "内容不符合展示要求，可删除后重新发布"}
                  </p>
                </div>
              </div>
            ) : null}

            {/* 描述 */}
            <div>
              <h3 className="mb-1.5 text-[13px] font-semibold text-stone-700">宝贝描述</h3>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-stone-600">
                {book.description || "这位书友没有留下描述，可以直接联系 TA 了解详情。"}
              </p>
            </div>

            {/* 卖家卡片：点名字进 TA 的书摊，看在售/已卖出的书 */}
            <div className="flex items-center gap-3 rounded-xl border border-stone-200/70 bg-white p-3.5">
              <Link
                href={`/seller/${encodeURIComponent(book.ownerId)}?name=${encodeURIComponent(book.sellerName)}`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
                aria-label={`查看 ${book.sellerName} 的书摊`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {book.sellerName.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-0.5 text-sm font-semibold text-stone-800">
                    <span className="truncate">{book.sellerName}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-400">
                    微信号
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-600">
                      {book.sellerWechat}
                    </span>
                  </p>
                </div>
              </Link>
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
                {book.status === "APPROVED" ? (
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50"
                    aria-label="分享这本书"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onToggleSold(book.id, !book.sold)}
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
