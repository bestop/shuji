"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Search, SlidersHorizontal } from "lucide-react";
import { BookCard } from "@/components/book-card";
import { DetailSheet } from "@/components/detail-sheet";
import { PublishSheet } from "@/components/publish-sheet";
import { ProfilePage } from "@/components/profile-page";
import { BottomNav } from "@/components/bottom-nav";
import { useStore } from "@/lib/store";
import { useMarket } from "@/lib/use-market";
import { getDeviceId } from "@/lib/device";
import { CATEGORIES, type Book, type SortKey } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "home" | "profile";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "new", label: "最新" },
  { key: "asc", label: "价低" },
  { key: "desc", label: "价高" },
];

export default function Page() {
  const favoriteIds = useStore((s) => s.favoriteIds);
  const profile = useStore((s) => s.profile);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  const market = useMarket();
  const books = market.books;
  const loading = market.loading;

  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("全部");
  const [sort, setSort] = useState<SortKey>("new");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  // 水合检测：避免 SSR 与 localStorage 持久化状态的不一致
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = books.filter((b) => {
      const hitCat = cat === "全部" || b.category === cat;
      if (!hitCat) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
      );
    });
    if (sort === "asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "desc") list = [...list].sort((a, b) => b.price - a.price);
    else list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [books, query, cat, sort]);

  const activeBook = books.find((b) => b.id === activeId) ?? null;

  const openBook = (b: Book) => {
    setActiveId(b.id);
    setDetailOpen(true);
  };

  if (!mounted || loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 pt-8 sm:max-w-6xl">
          <div className="h-9 w-32 animate-pulse rounded-lg bg-stone-200/70" />
          <div className="mt-6 h-11 animate-pulse rounded-full bg-stone-200/70" />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4.6] animate-pulse rounded-2xl bg-stone-200/70" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶栏 */}
      <header className="sticky top-0 z-30 border-b border-stone-200/60 bg-[#F7F5F1]/90 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-4 sm:max-w-6xl">
          <div className="flex items-center justify-between pb-3 pt-[max(0.875rem,env(safe-area-inset-top))]">
            <div className="flex items-baseline gap-2">
              <h1 className="font-serif-sc text-[26px] font-bold leading-none tracking-wide text-stone-900">
                书<span className="text-primary">集</span>
              </h1>
              <p className="text-[11px] tracking-[0.2em] text-stone-400">让好书流动起来</p>
            </div>
            <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-[11px] text-stone-500">
              {market.mode === "server"
                ? "云端市集 · 多端同步"
                : market.mode === "local"
                  ? "本机体验模式"
                  : "校园二手书市集"}
            </span>
          </div>
        </div>
      </header>

      <main>
        <AnimatePresence mode="wait">
          {view === "home" ? (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="mx-auto max-w-lg px-4 sm:max-w-6xl">
                {/* 搜索 */}
                <div className="relative pt-4">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-stone-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜索书名、作者、关键词…"
                    aria-label="搜索书籍"
                    className="h-11 w-full rounded-full border border-stone-200/80 bg-white pl-10 pr-4 text-[15px] text-stone-800 placeholder:text-stone-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                </div>

                {/* 分类 + 排序 */}
                <div className="-mx-4 mt-3.5 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCat(c)}
                      aria-pressed={cat === c}
                      className={cn(
                        "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                        cat === c
                          ? "border-primary bg-primary font-medium text-primary-foreground shadow-sm shadow-primary/25"
                          : "border-stone-200 bg-white/80 text-stone-500 hover:border-stone-300"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* 结果栏 */}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-stone-400">
                    共 <span className="font-semibold text-stone-600">{filtered.length}</span> 本好书
                    {cat !== "全部" ? ` · ${cat}` : ""}
                  </p>
                  <div
                    className="flex items-center gap-0.5 rounded-full border border-stone-200 bg-white/80 p-0.5"
                    role="group"
                    aria-label="排序方式"
                  >
                    <SlidersHorizontal className="ml-1.5 h-3 w-3 text-stone-300" aria-hidden />
                    {SORTS.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setSort(s.key)}
                        aria-pressed={sort === s.key}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                          sort === s.key
                            ? "bg-stone-800 font-medium text-white"
                            : "text-stone-500"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 书卡网格 */}
                {filtered.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 pb-32 pt-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                    {filtered.map((b, i) => (
                      <BookCard key={b.id} book={b} index={i} onOpen={openBook} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-200 bg-white/60 px-6 py-16 text-center">
                    <BookOpen className="mb-3 h-9 w-9 text-stone-300" aria-hidden />
                    <p className="text-sm text-stone-500">没有找到相关的书</p>
                    <p className="mt-1 text-xs text-stone-400">换个关键词，或点底部 ＋ 成为第一个发布的人</p>
                    {(query || cat !== "全部") && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setCat("全部");
                        }}
                        className="mt-4 rounded-full border border-stone-200 px-4 py-1.5 text-xs text-stone-500 hover:bg-white"
                      >
                        清除筛选条件
                      </button>
                    )}
                  </div>
                )}

                {/* 页脚 */}
                <footer className="pb-32 pt-2 text-center sm:pb-28">
                  <p className="font-serif-sc text-xs tracking-[0.25em] text-stone-300">
                    书集 · 二手书交易
                  </p>
                  <p className="mt-1 text-[10px] text-stone-300">
                    {market.mode === "server"
                      ? "云端同步 · 交易请当面验书、微信沟通"
                      : "数据保存在本机浏览器，交易请当面验书、微信沟通"}
                  </p>
                </footer>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <ProfilePage
                profile={profile}
                books={books}
                myId={mounted ? getDeviceId() : "server"}
                favoriteIds={favoriteIds}
                onOpenBook={openBook}
                onToggleSold={(id, nextSold) => void market.toggleSold(id, nextSold)}
                onRemoveBook={(id) => void market.removeBook(id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav
        view={view}
        onHome={() => setView("home")}
        onProfile={() => setView("profile")}
        onPublish={() => setPublishOpen(true)}
      />

      <DetailSheet
        book={activeBook}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        isMine={activeBook ? activeBook.ownerId === (mounted ? getDeviceId() : "server") : false}
        isFavorite={activeBook ? favoriteIds.includes(activeBook.id) : false}
        onToggleFavorite={toggleFavorite}
        onToggleSold={(id, nextSold) => void market.toggleSold(id, nextSold)}
        onDelete={(id) => {
          void market.removeBook(id);
          setActiveId(null);
        }}
      />

      <PublishSheet
        open={publishOpen}
        onOpenChange={setPublishOpen}
        profile={profile}
        onPublish={market.addBook}
        onGoProfile={() => {
          setPublishOpen(false);
          setView("profile");
        }}
      />
    </div>
  );
}
