import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Clock3, Layers, Tag } from "lucide-react";
import { hasDb, getDb } from "@/lib/db";
import { formatPrice, timeAgo } from "@/lib/seed";
import { LandingShareGuide } from "@/components/landing-share-guide";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/** 服务端直查书籍（仅已上架的书对外可见） */
async function fetchBook(id: string) {
  if (!hasDb()) return null;
  try {
    return await getDb().book.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const b = await fetchBook(id);
  if (!b || b.status !== "APPROVED") {
    return { title: "书没找到 · 易书", robots: { index: false } };
  }
  const title = `《${b.title}》仅售 ¥${formatPrice(b.price)} · 易书`;
  const desc = `${b.author} 著 · ${b.condition}${
    b.description ? ` · ${b.description.slice(0, 60)}` : ""
  }。上易书联系书友，让好书流动起来。`;
  const og = `/api/og/book/${b.id}`;
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `/book/${b.id}`,
      siteName: "易书",
      type: "website",
      images: [{ url: og, width: 1200, height: 630, alt: `《${b.title}》` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [og],
    },
  };
}

export default async function BookLanding({ params }: Props) {
  const { id } = await params;
  const b = await fetchBook(id);
  if (!b || b.status !== "APPROVED") notFound();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 pb-16 pt-[max(0.875rem,env(safe-area-inset-top))]">
        {/* 品牌行 */}
        <Link href="/" className="inline-flex items-baseline gap-2 pt-2">
          <span className="font-serif-sc text-[22px] font-bold leading-none tracking-wide text-stone-900">
            易<span className="text-primary">书</span>
          </span>
          <span className="text-[10px] tracking-[0.2em] text-stone-400">
            二手交易市集
          </span>
        </Link>

        {/* 分享卡片图（同时是微信抓取缩略图的兜底真实图片） */}
        <img
          src={`/api/og/book/${b.id}`}
          alt={`《${b.title}》分享卡片`}
          width={1200}
          height={630}
          className="mt-4 w-full rounded-2xl border border-stone-200/60 shadow-sm"
        />

        {/* 书籍信息 */}
        <section className="mt-5 rounded-2xl border border-stone-200/60 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-serif-sc text-xl font-bold leading-snug text-stone-900">
              {b.title}
            </h1>
            {b.sold ? (
              <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-500">
                已售出
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {b.author} 著 · 由「{b.sellerName}」发布
          </p>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-lg font-bold text-[#C2540A]">¥</span>
            <span className="text-3xl font-bold leading-none tracking-tight text-[#C2540A]">
              {formatPrice(b.price)}
            </span>
            {b.originalPrice ? (
              <span className="text-xs text-stone-400 line-through">
                原价 ¥{formatPrice(b.originalPrice)}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-50 px-2 py-2 text-stone-600">
              <Layers className="h-3.5 w-3.5 text-stone-400" aria-hidden />
              <span className="truncate">{b.category}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-50 px-2 py-2 text-stone-600">
              <Tag className="h-3.5 w-3.5 text-stone-400" aria-hidden />
              <span className="truncate">{b.condition}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-50 px-2 py-2 text-stone-600">
              <Clock3 className="h-3.5 w-3.5 text-stone-400" aria-hidden />
              <span className="truncate">{timeAgo(b.createdAt.getTime())}</span>
            </div>
          </div>

          {b.description ? (
            <div className="mt-4 border-t border-stone-100 pt-4">
              <h2 className="mb-1.5 text-[13px] font-semibold text-stone-700">
                宝贝描述
              </h2>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-stone-600">
                {b.description}
              </p>
            </div>
          ) : null}
        </section>

        {/* 行动区 */}
        <div className="mt-5">
          <Link
            href={`/?book=${b.id}`}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            打开易书，联系书友
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="mt-3 text-center text-xs leading-relaxed text-stone-400">
            长按上方卡片图可发给朋友 · 右上角「···」可转发本书链接
            <br />
            交易请当面验书 · 易书 ys.hikid.vip
          </p>
        </div>
      </div>
      {/* 应用内分享跳转而来时，自动弹出「···」转发引导（内嵌分享卡图，支持长按直发） */}
      <LandingShareGuide cardUrl={`/api/og/book/${b.id}`} bookId={b.id} />
    </main>
  );
}
