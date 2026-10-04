import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, BookOpen, PackageCheck, Store } from "lucide-react";
import { hasDb, getDb } from "@/lib/db";
import { formatPrice } from "@/lib/seed";
import { BookCover } from "@/components/book-cover";
import { WechatChip } from "@/components/wechat-chip";

export const dynamic = "force-dynamic";

type SellerBook = {
  id: string;
  title: string;
  author: string;
  price: number;
  originalPrice: number | null;
  cover: string | null;
  sold: boolean;
};

type Props = {
  params: Promise<{ ownerId: string }>;
  searchParams: Promise<{ name?: string | string[] }>;
};

/**
 * 卖家身份由「发布设备 + 展示昵称」共同定位：
 * 同一台设备改过昵称、或示例数据共用了 ownerId 时，
 * 以昵称分组才符合买家眼中「同一个摊主」的直觉。
 * cache()：同一次请求内 metadata 与页面共享一次查询。
 */
const fetchSellerBooks = cache(
  async (ownerId: string, sellerName: string): Promise<SellerBook[]> => {
    if (!hasDb()) return [];
    try {
      const rows = await getDb().book.findMany({
        where: {
          ownerId,
          status: "APPROVED",
          ...(sellerName ? { sellerName } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      // 未携带昵称参数时按最新一本书的昵称归摊，避免把不同摊主混在一页
      const name = sellerName || rows[0]?.sellerName;
      if (!name) return [];
      return rows.filter((b) => b.sellerName === name);
    } catch (e) {
      console.error("[seller:page]", e);
      return [];
    }
  }
);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { ownerId } = await params;
  const sp = await searchParams;
  const name = typeof sp.name === "string" ? sp.name.trim() : "";
  const books = await fetchSellerBooks(ownerId, name);
  if (!books.length) {
    return { title: "这个书摊不在了 · 易书", robots: { index: false } };
  }
  const displayName = name || books[0].sellerName;
  return {
    title: `${displayName} 的书摊 · 易书`,
    description: `看看 ${displayName} 正在出售和已经卖出的二手好书，上易书联系书友，让好书流动起来。`,
    robots: { index: false },
  };
}

export default async function SellerPage({ params, searchParams }: Props) {
  const { ownerId } = await params;
  const sp = await searchParams;
  const name = typeof sp.name === "string" ? sp.name.trim() : "";
  const books = await fetchSellerBooks(ownerId, name);
  if (!books.length) notFound();

  const displayName = name || books[0].sellerName;
  const onSale = books.filter((b) => !b.sold);
  const soldOut = books.filter((b) => b.sold);

  // 所有书共用同一个微信号时才在摊位卡上展示（摊主换过微信号时不误导买家）
  const wechats = new Set(books.map((b) => b.sellerWechat));
  const sharedWechat = wechats.size === 1 ? books[0].sellerWechat : "";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 pb-16 pt-[max(0.875rem,env(safe-area-inset-top))]">
        {/* 品牌行 */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[13px] text-stone-500 transition-colors hover:text-stone-800"
            aria-label="返回市集"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            返回市集
          </Link>
          <Link href="/" className="inline-flex items-baseline gap-2">
            <span className="font-serif-sc text-[20px] font-bold leading-none tracking-wide text-stone-900">
              易<span className="text-primary">书</span>
            </span>
            <span className="text-[10px] tracking-[0.2em] text-stone-400">二手交易市集</span>
          </Link>
        </div>

        {/* 摊位卡 */}
        <section className="mt-4 rounded-2xl border border-stone-200/60 bg-white p-5">
          <div className="flex items-center gap-3.5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary font-serif-sc text-xl font-bold text-primary-foreground shadow-sm">
              {displayName.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-serif-sc text-xl font-bold leading-snug text-stone-900">
                {displayName} 的书摊
              </h1>
              <p className="mt-1 flex items-center gap-1 text-xs text-stone-400">
                <Store className="h-3 w-3" aria-hidden />
                易书书友 · 让好书流动起来
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 divide-x divide-stone-100 rounded-xl bg-stone-50 py-3 text-center">
            <div>
              <p className="text-lg font-bold leading-none text-stone-800">{onSale.length}</p>
              <p className="mt-1.5 text-[11px] text-stone-400">正在出售</p>
            </div>
            <div>
              <p className="text-lg font-bold leading-none text-stone-800">{soldOut.length}</p>
              <p className="mt-1.5 text-[11px] text-stone-400">已卖出</p>
            </div>
          </div>

          {sharedWechat ? (
            <div className="mt-3">
              <WechatChip wechat={sharedWechat} />
            </div>
          ) : null}
        </section>

        {/* 正在出售 */}
        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-serif-sc text-base font-bold text-stone-900">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden />
            正在出售
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-normal text-stone-500">
              {onSale.length} 本
            </span>
          </h2>
          {onSale.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {onSale.map((b) => (
                <BookTile key={b.id} book={b} />
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-stone-200 bg-white/60 px-4 py-6 text-center text-xs text-stone-400">
              摊位暂时空着，好书画个圈再来逛逛
            </p>
          )}
        </section>

        {/* 已卖出 */}
        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-serif-sc text-base font-bold text-stone-900">
            <PackageCheck className="h-4 w-4 text-stone-400" aria-hidden />
            已卖出
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-normal text-stone-500">
              {soldOut.length} 本
            </span>
          </h2>
          {soldOut.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {soldOut.map((b) => (
                <BookTile key={b.id} book={b} sold />
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-stone-200 bg-white/60 px-4 py-6 text-center text-xs text-stone-400">
              还没有卖出的书记录
            </p>
          )}
        </section>

        <p className="mt-8 text-center text-xs leading-relaxed text-stone-400">
          点击书籍回市集查看详情并联系书友
          <br />
          交易请当面验书 · 易书 ys.hikid.vip
        </p>
      </div>
    </main>
  );
}

/** 摊位上的书卡：点击回市集自动弹出该书详情 */
function BookTile({ book: b, sold = false }: { book: SellerBook; sold?: boolean }) {
  return (
    <Link
      href={`/?book=${b.id}`}
      className="group block overflow-hidden rounded-2xl border border-stone-200/70 bg-card shadow-[0_1px_2px_rgba(60,50,30,0.05)] transition-all duration-200 active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(60,50,30,0.25)] focus-visible:outline-2 focus-visible:outline-primary"
      aria-label={sold ? `查看已售出的《${b.title}》` : `查看《${b.title}》详情`}
    >
      <div className="relative">
        <BookCover
          bookId={b.id}
          title={b.title}
          author={b.author}
          cover={b.cover ?? undefined}
          className="aspect-[3/4] w-full"
        />
        {sold ? (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-950/40 backdrop-blur-[1px]">
            <span className="rotate-[-8deg] rounded-md border-2 border-white/90 px-3 py-1 font-serif-sc text-sm font-bold tracking-[0.2em] text-white/95">
              已售出
            </span>
          </div>
        ) : null}
      </div>
      <div className="space-y-1 p-2.5">
        <h3 className="font-serif-sc line-clamp-1 text-[13px] font-semibold text-stone-800">
          {b.title}
        </h3>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-bold text-[#C2540A]">¥</span>
          <span className="text-[15px] font-bold leading-none text-[#C2540A]">
            {formatPrice(b.price)}
          </span>
          {b.originalPrice ? (
            <span className="text-[10px] text-stone-400 line-through">
              ¥{formatPrice(b.originalPrice)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
