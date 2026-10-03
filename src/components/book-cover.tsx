"use client";

import { gradientFor } from "@/lib/seed";
import { cn } from "@/lib/utils";

type Props = {
  bookId: string;
  title: string;
  author?: string;
  cover?: string;
  className?: string;
  /** 标题字号缩放：卡片封面用 sm，详情页用 lg */
  size?: "sm" | "lg";
};

/**
 * 书籍封面：有图显示图片，无图时以渐变 + 衬线书名
 * 生成一张“素书封”，保证卡片始终优雅完整。
 */
export function BookCover({ bookId, title, author, cover, className, size = "sm" }: Props) {
  if (cover) {
    return (
      <div className={cn("relative overflow-hidden bg-stone-100", className)}>
        <img
          src={cover}
          alt={`《${title}》封面`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  const [c1, c2] = gradientFor(bookId);
  const short = title.replace(/^《|》$/g, "");
  const main = short.length > 10 ? short.slice(0, 10) : short;

  return (
    <div
      className={cn("relative flex flex-col items-center justify-center overflow-hidden", className)}
      style={{ background: `linear-gradient(150deg, ${c1} 0%, ${c2} 100%)` }}
      aria-label={`《${title}》封面`}
      role="img"
    >
      {/* 内边框装饰 */}
      <div className="pointer-events-none absolute inset-2 rounded-[4px] border border-white/25" />
      <div className="pointer-events-none absolute inset-0 opacity-20"
        style={{ background: "radial-gradient(120% 90% at 20% 10%, rgba(255,255,255,.5) 0%, transparent 55%)" }}
      />
      <p
        className={cn(
          "px-3 text-center font-serif-sc font-semibold leading-snug tracking-wide text-white/95 drop-shadow-sm",
          size === "sm" ? "text-[13px]" : "text-xl"
        )}
      >
        {main}
      </p>
      <div className={cn("my-1.5 h-px w-8 bg-white/40", size === "lg" && "my-3 w-12")} />
      {author ? (
        <p
          className={cn(
            "px-3 text-center font-serif-sc text-white/75",
            size === "sm" ? "text-[10px]" : "text-sm"
          )}
        >
          {author}
        </p>
      ) : null}
      <span className="absolute bottom-2 right-2.5 font-serif-sc text-[9px] tracking-[0.3em] text-white/50">
        书集
      </span>
    </div>
  );
}
