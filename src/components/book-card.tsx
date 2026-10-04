"use client";

import { motion } from "framer-motion";
import { Images } from "lucide-react";
import { BookCover } from "./book-cover";
import { formatPrice, timeAgo } from "@/lib/seed";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  book: Book;
  index?: number;
  onOpen: (book: Book) => void;
};

const CONDITION_TONE: Record<string, string> = {
  全新: "bg-emerald-50 text-emerald-700",
  几乎全新: "bg-teal-50 text-teal-700",
  轻微使用: "bg-amber-50 text-amber-700",
  有笔记: "bg-stone-100 text-stone-600",
};

export function BookCard({ book, index = 0, onOpen }: Props) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3), ease: "easeOut" }}
    >
      <button
        type="button"
        onClick={() => onOpen(book)}
        className="group block w-full overflow-hidden rounded-2xl border border-stone-200/70 bg-card text-left shadow-[0_1px_2px_rgba(60,50,30,0.05)] transition-all duration-200 active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(60,50,30,0.25)] focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={`查看《${book.title}》详情`}
      >
        <div className="relative">
          <BookCover
            bookId={book.id}
            title={book.title}
            author={book.author}
            cover={book.cover}
            className="aspect-[3/4] w-full"
          />
          {book.sold ? (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-950/40 backdrop-blur-[1px]">
              <span className="rotate-[-8deg] rounded-md border-2 border-white/90 px-3 py-1 font-serif-sc text-sm font-bold tracking-[0.2em] text-white/95">
                已售出
              </span>
            </div>
          ) : null}
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm",
              book.sold
                ? "bg-white/80 text-stone-500"
                : CONDITION_TONE[book.condition] ?? "bg-stone-100 text-stone-600"
            )}
          >
            {book.condition}
          </span>
          {(book.imageCount ?? book.images?.length ?? 0) > 1 ? (
            <span
              className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-stone-950/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
              data-testid="image-count-chip"
            >
              <Images className="h-3 w-3" aria-hidden />
              {book.imageCount ?? book.images?.length}图
            </span>
          ) : null}
        </div>

        <div className="space-y-1.5 p-3">
          <h3 className="font-serif-sc line-clamp-2 min-h-[2.6em] text-[14px] font-semibold leading-[1.35] text-stone-800">
            {book.title}
          </h3>
          <p className="truncate text-[11px] text-stone-400">{book.author}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-bold text-[#C2540A]">¥</span>
            <span className="text-[17px] font-bold leading-none text-[#C2540A]">
              {formatPrice(book.price)}
            </span>
            {book.originalPrice ? (
              <span className="text-[10px] text-stone-400 line-through">
                ¥{formatPrice(book.originalPrice)}
              </span>
            ) : null}
            {book.freeShipping ? (
              <span className="ml-auto rounded bg-emerald-50 px-1 py-0.5 text-[9px] font-medium text-emerald-700">
                包邮
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/90 text-[8px] font-bold text-primary-foreground"
                aria-hidden
              >
                {book.sellerName.slice(0, 1)}
              </span>
              <span className="truncate text-[11px] text-stone-500">{book.sellerName}</span>
            </span>
            <span className="shrink-0 text-[10px] text-stone-400">{timeAgo(book.createdAt)}</span>
          </div>
        </div>
      </button>
    </motion.article>
  );
}
