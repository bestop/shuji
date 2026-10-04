"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  LockKeyhole,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { BookCover } from "./book-cover";
import { formatPrice, timeAgo } from "@/lib/seed";
import type { Book, BookStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 审核动作后通知市集刷新 */
  onChanged?: () => void;
};

type Session = { enabled: boolean; isAdmin: boolean };
type Phase = "loading" | "disabled" | "login" | "panel";

const TABS: { key: BookStatus; label: string; tone: string; activeTone: string }[] = [
  {
    key: "PENDING",
    label: "待审核",
    tone: "text-amber-600",
    activeTone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "APPROVED",
    label: "已上架",
    tone: "text-primary",
    activeTone: "bg-primary/5 text-primary border-primary/30",
  },
  {
    key: "REJECTED",
    label: "未通过",
    tone: "text-destructive",
    activeTone: "bg-destructive/5 text-destructive border-destructive/30",
  },
];

export function AdminSheet({ open, onOpenChange, onChanged }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [tab, setTab] = useState<BookStatus>("PENDING");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const loadBooks = useCallback(async () => {
    setLoadingBooks(true);
    try {
      const res = await fetch("/api/admin/books", { cache: "no-store" });
      if (res.status === 401) {
        setPhase("login");
        return;
      }
      const data = (await res.json()) as { books?: Book[]; error?: string };
      if (!res.ok) throw new Error(data.error || "加载失败");
      setBooks(Array.isArray(data.books) ? data.books : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载失败，请稍后重试");
    } finally {
      setLoadingBooks(false);
    }
  }, []);

  const loadSession = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const s = (await res.json()) as Session;
      if (!s.enabled) {
        setPhase("disabled");
      } else if (s.isAdmin) {
        setPhase("panel");
        void loadBooks();
      } else {
        setPhase("login");
      }
    } catch {
      setPhase("login");
    }
  }, [loadBooks]);

  useEffect(() => {
    if (open) {
      setPasscode("");
      setLoginError("");
      setRejectId(null);
      setNote("");
      void loadSession();
    }
  }, [open, loadSession]);

  const handleLogin = async () => {
    const p = passcode.trim();
    if (!p) {
      setLoginError("请输入口令");
      return;
    }
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: p }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setLoginError(data.error || "登录失败，请重试");
        return;
      }
      toast.success("欢迎回来，管理员");
      setPhase("panel");
      void loadBooks();
    } catch {
      setLoginError("网络异常，请重试");
    } finally {
      setLoggingIn(false);
    }
  };

  const act = async (b: Book, action: "approve" | "reject", noteText = "") => {
    setBusyId(b.id);
    try {
      const res = await fetch(`/api/admin/books/${encodeURIComponent(b.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: noteText }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        book?: Book;
        error?: string;
      };
      if (!res.ok || !data.book) throw new Error(data.error || "操作失败");
      setBooks((prev) => prev.map((x) => (x.id === b.id ? data.book! : x)));
      toast.success(
        action === "approve" ? `《${b.title}》已通过上架` : `《${b.title}》已驳回`
      );
      setRejectId(null);
      setNote("");
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    setBooks([]);
    setPasscode("");
    setPhase("login");
    toast.success("已退出管理员登录");
  };

  const counts = useMemo(() => {
    const c: Record<BookStatus, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const b of books) c[b.status] += 1;
    return c;
  }, [books]);

  const list = useMemo(() => books.filter((b) => b.status === tab), [books, tab]);

  const startReject = (b: Book) => {
    setRejectId(b.id);
    setNote("");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto h-[86vh] max-w-lg rounded-t-2xl">
        <DrawerTitle className="sr-only">管理员审核</DrawerTitle>
        <div className="flex h-full min-h-0 flex-col">
          {/* 标题栏 */}
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
            <span className="w-8" />
            <h2 className="flex items-center gap-1.5 font-serif-sc text-base font-bold text-stone-900">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
              管理员审核
            </h2>
            {phase === "panel" ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                aria-label="退出管理员登录"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* 主体 */}
          {phase === "loading" ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-stone-300" aria-label="加载中" />
            </div>
          ) : phase === "disabled" ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <ShieldX className="mb-3 h-10 w-10 text-stone-300" aria-hidden />
              <p className="text-sm font-semibold text-stone-700">未开启审核功能</p>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-400">
                需要在服务端配置环境变量 SHUJI_ADMIN_PASSCODE 后，新发布的书籍才会进入审核队列
              </p>
            </div>
          ) : phase === "login" ? (
            <div className="flex flex-1 flex-col justify-center px-8 pb-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <LockKeyhole className="h-6 w-6 text-primary" aria-hidden />
              </div>
              <p className="mt-4 text-center font-serif-sc text-lg font-bold text-stone-900">
                管理员登录
              </p>
              <p className="mt-1 text-center text-xs text-stone-400">
                输入管理员口令，审核新发布的书籍
              </p>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleLogin();
                }}
                placeholder="管理员口令"
                aria-label="管理员口令"
                autoComplete="current-password"
                className="mt-6 h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-center text-[15px] tracking-widest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {loginError ? (
                <p className="mt-2 text-center text-xs text-destructive" role="alert">
                  {loginError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void handleLogin()}
                disabled={loggingIn}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-primary/90 disabled:opacity-60"
              >
                {loggingIn && <Loader2 className="h-4 w-4 animate-spin" />}
                {loggingIn ? "登录中…" : "登录"}
              </button>
            </div>
          ) : (
            <>
              {/* 状态统计 + 切换 */}
              <div className="flex gap-2 px-4 pt-4">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setTab(t.key);
                      setRejectId(null);
                    }}
                    aria-pressed={tab === t.key}
                    className={cn(
                      "flex flex-1 flex-col items-center rounded-xl border py-2.5 transition-colors",
                      tab === t.key
                        ? t.activeTone
                        : "border-stone-200 bg-white text-stone-500"
                    )}
                  >
                    <span className={cn("text-base font-bold leading-none", tab === t.key ? "" : t.tone)}>
                      {counts[t.key]}
                    </span>
                    <span className="mt-1 text-[11px]">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* 列表 */}
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-6 pt-3">
                {loadingBooks ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-stone-300" aria-label="加载中" />
                  </div>
                ) : list.length === 0 ? (
                  <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-200 bg-white/60 px-6 py-12 text-center">
                    <BadgeCheck className="mb-3 h-8 w-8 text-stone-300" aria-hidden />
                    <p className="text-sm text-stone-400">
                      {tab === "PENDING"
                        ? "没有待审核的新书，市集一切安好"
                        : tab === "APPROVED"
                          ? "还没有已上架的书籍"
                          : "没有被驳回的书籍"}
                    </p>
                  </div>
                ) : (
                  list.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-stone-200/70 bg-card p-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <BookCover
                          bookId={b.id}
                          title={b.title}
                          cover={b.cover}
                          className="aspect-[3/4] w-12 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-serif-sc text-sm font-semibold text-stone-800">
                            {b.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-stone-400">
                            {b.sellerName} · {b.condition} · {timeAgo(b.createdAt)}
                            {b.freeShipping ? " · 包邮" : ""}
                          </p>
                          <p className="mt-0.5 text-sm font-bold text-[#C2540A]">
                            ¥{formatPrice(b.price)}
                          </p>
                        </div>
                        {/* 操作区 */}
                        <div className="flex shrink-0 flex-col gap-1.5">
                          {b.status === "PENDING" ? (
                            <>
                              <button
                                type="button"
                                disabled={busyId === b.id}
                                onClick={() => void act(b, "approve")}
                                className="flex h-7 items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                              >
                                <BadgeCheck className="h-3 w-3" aria-hidden /> 通过
                              </button>
                              <button
                                type="button"
                                disabled={busyId === b.id}
                                onClick={() => startReject(b)}
                                className="flex h-7 items-center gap-1 rounded-full border border-stone-200 px-2.5 text-[11px] text-stone-500 transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
                              >
                                <Ban className="h-3 w-3" aria-hidden /> 驳回
                              </button>
                            </>
                          ) : b.status === "APPROVED" ? (
                            <button
                              type="button"
                              disabled={busyId === b.id}
                              onClick={() => startReject(b)}
                              className="flex h-7 items-center gap-1 rounded-full border border-stone-200 px-2.5 text-[11px] text-stone-500 transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
                            >
                              <Ban className="h-3 w-3" aria-hidden /> 下架
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === b.id}
                              onClick={() => void act(b, "approve")}
                              className="flex h-7 items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                            >
                              <BadgeCheck className="h-3 w-3" aria-hidden /> 恢复上架
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 驳回原因 */}
                      {b.status === "REJECTED" && b.reviewNote ? (
                        <p className="mt-2 rounded-lg bg-destructive/5 px-2.5 py-1.5 text-[11px] leading-relaxed text-destructive/80">
                          驳回原因：{b.reviewNote}
                        </p>
                      ) : null}

                      {/* 驳回备注输入 */}
                      {rejectId === b.id ? (
                        <div className="mt-2.5 rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                          <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={100}
                            placeholder="驳回原因（选填，会展示给发布者）"
                            aria-label="驳回原因"
                            className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-[13px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              disabled={busyId === b.id}
                              onClick={() => void act(b, "reject", note)}
                              className="h-8 flex-1 rounded-lg bg-destructive text-xs font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
                            >
                              确认驳回
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectId(null)}
                              className="h-8 flex-1 rounded-lg border border-stone-200 bg-white text-xs text-stone-500 hover:bg-stone-50"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              {/* 底部刷新 */}
              <div className="border-t border-stone-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => void loadBooks()}
                  disabled={loadingBooks}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-stone-200 text-[13px] font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-60"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loadingBooks && "animate-spin")} aria-hidden />
                  刷新列表
                </button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
