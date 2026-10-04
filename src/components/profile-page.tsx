"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Heart,
  Pencil,
  PenLine,
  ShieldCheck,
  Store,
  Trash2,
  PackageCheck,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { BookCover } from "./book-cover";
import { formatPrice } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Book, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  profile: Profile;
  books: Book[];
  /** 当前设备 ID，用于筛出「我的发布」 */
  myId: string;
  favoriteIds: string[];
  /** 云端模式下展示管理员入口 */
  showAdmin: boolean;
  onOpenAdmin: () => void;
  onOpenBook: (b: Book) => void;
  onToggleSold: (id: string, nextSold: boolean) => void;
  onRemoveBook: (id: string) => void;
};

export function ProfilePage({
  profile,
  books,
  myId,
  favoriteIds,
  showAdmin,
  onOpenAdmin,
  onOpenBook,
  onToggleSold,
  onRemoveBook,
}: Props) {
  const updateProfile = useStore((s) => s.updateProfile);

  const [tab, setTab] = useState<"mine" | "fav">("mine");
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState(profile.nickname);
  const [wechat, setWechat] = useState(profile.wechatId);

  const mine = books.filter((b) => b.ownerId === myId);
  const favs = favoriteIds
    .map((id) => books.find((b) => b.id === id))
    .filter((b): b is Book => Boolean(b));
  const soldCount = mine.filter((b) => b.sold).length;

  const list = tab === "mine" ? mine : favs;

  const saveProfile = () => {
    const n = nick.trim();
    if (!n) return toast.error("昵称不能为空");
    updateProfile({ nickname: n, wechatId: wechat.trim() });
    setEditing(false);
    toast.success("资料已更新");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto w-full max-w-lg px-4 pb-32 pt-6 sm:max-w-2xl"
    >
      {/* 个人卡片 */}
      <section className="flex items-center gap-4 rounded-2xl border border-stone-200/70 bg-card p-5 shadow-sm">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary font-serif-sc text-2xl font-bold text-primary-foreground">
          {(profile.nickname || "书").slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif-sc text-lg font-bold text-stone-900">
            {profile.nickname || "爱书的你"}
          </p>
          <p className="mt-1 truncate text-xs text-stone-400">
            {profile.wechatId ? `微信号：${profile.wechatId}` : "还未设置微信号，发布书籍时需填写"}
          </p>
          <div className="mt-2.5 flex gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <Store className="h-3.5 w-3.5 text-stone-400" aria-hidden /> 发布 {mine.length}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-stone-400" aria-hidden /> 收藏 {favs.length}
            </span>
            <span className="flex items-center gap-1">
              <PackageCheck className="h-3.5 w-3.5 text-stone-400" aria-hidden /> 卖出 {soldCount}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setNick(profile.nickname);
            setWechat(profile.wechatId);
            setEditing(true);
          }}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-stone-200 px-3.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden /> 编辑
        </button>
      </section>

      {/* 编辑资料 */}
      {editing ? (
        <motion.section
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 overflow-hidden rounded-2xl border border-stone-200/70 bg-card p-4 shadow-sm"
        >
          <div className="space-y-3">
            <div>
              <label htmlFor="pr-nick" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                昵称
              </label>
              <input
                id="pr-nick"
                className="h-10 w-full rounded-xl border border-stone-200 px-3.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={nick}
                maxLength={16}
                onChange={(e) => setNick(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="pr-wechat" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                微信号 <span className="font-normal text-stone-400">（发布时自动填入）</span>
              </label>
              <input
                id="pr-wechat"
                className="h-10 w-full rounded-xl border border-stone-200 px-3.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={wechat}
                maxLength={30}
                onChange={(e) => setWechat(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={saveProfile}
                className="h-10 flex-1 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary/90"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-10 flex-1 rounded-xl border border-stone-200 text-sm text-stone-500 hover:bg-stone-50"
              >
                取消
              </button>
            </div>
          </div>
        </motion.section>
      ) : null}

      {/* 分段标签 */}
      <div className="mt-5 flex rounded-xl bg-stone-100 p-1" role="tablist" aria-label="我的书籍列表">
        {(
          [
            ["mine", "我的发布", mine.length],
            ["fav", "我的收藏", favs.length],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm transition-all",
              tab === key
                ? "bg-white font-semibold text-stone-800 shadow-sm"
                : "text-stone-500"
            )}
          >
            {label} <span className="text-xs">({count})</span>
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="mt-3 space-y-3">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white/60 px-6 py-12 text-center">
            {tab === "mine" ? (
              <PenLine className="mx-auto mb-3 h-8 w-8 text-stone-300" aria-hidden />
            ) : (
              <Heart className="mx-auto mb-3 h-8 w-8 text-stone-300" aria-hidden />
            )}
            <p className="text-sm text-stone-400">
              {tab === "mine" ? "还没有发布过书籍" : "收藏夹还是空的"}
            </p>
            <p className="mt-1 text-xs text-stone-300">
              {tab === "mine" ? "点击底部的 ＋ 号，让闲置好书流动起来" : "在书籍详情页点 ♡ 收藏心仪好书"}
            </p>
          </div>
        ) : (
          list.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-card p-3 shadow-sm"
            >
              <button
                type="button"
                onClick={() => onOpenBook(b)}
                className="shrink-0 overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
                aria-label={`查看《${b.title}》`}
              >
                <BookCover
                  bookId={b.id}
                  title={b.title}
                  cover={b.cover}
                  className="aspect-[3/4] w-14"
                />
              </button>
              <button
                type="button"
                onClick={() => onOpenBook(b)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate font-serif-sc text-sm font-semibold text-stone-800">
                  {b.title}
                </p>
                <p className="mt-0.5 text-xs text-stone-400">
                  {b.condition} · {b.category}
                  {b.freeShipping ? " · 包邮" : ""}
                </p>
                <p className="mt-1 text-sm font-bold text-[#C2540A]">
                  ¥{formatPrice(b.price)}
                  {b.sold ? (
                    <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-normal text-stone-400">
                      已售出
                    </span>
                  ) : null}
                  {b.status === "PENDING" ? (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-normal text-amber-700">
                      待审核
                    </span>
                  ) : null}
                  {b.status === "REJECTED" ? (
                    <span
                      className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-normal text-destructive"
                      title={b.reviewNote || undefined}
                    >
                      未通过
                    </span>
                  ) : null}
                </p>
              </button>
              {tab === "mine" ? (
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleSold(b.id, !b.sold);
                      toast.success(b.sold ? "已重新上架" : "已标记为售出");
                    }}
                    className={cn(
                      "flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] transition-colors",
                      b.sold
                        ? "border-stone-200 text-stone-500"
                        : "border-primary/40 bg-primary/5 text-primary"
                    )}
                  >
                    {b.sold ? (
                      <><RotateCcw className="h-3 w-3" aria-hidden /> 上架</>
                    ) : (
                      <><PackageCheck className="h-3 w-3" aria-hidden /> 售出</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveBook(b.id);
                      toast.success("已删除");
                    }}
                    className="flex h-7 items-center gap-1 rounded-full border border-stone-200 px-2.5 text-[11px] text-stone-400 transition-colors hover:border-destructive/40 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden /> 删除
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {/* 管理员入口（云端模式展示） */}
      {showAdmin ? (
        <button
          type="button"
          onClick={onOpenAdmin}
          className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-stone-200/70 bg-card p-4 text-left shadow-sm transition-colors hover:bg-stone-50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-stone-800">管理员审核</span>
            <span className="mt-0.5 block text-xs text-stone-400">
              审核新发布的书籍，维护市集秩序
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" aria-hidden />
        </button>
      ) : null}
    </motion.div>
  );
}
