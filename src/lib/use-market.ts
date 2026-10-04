"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Book, BookInput } from "./types";
import { useStore } from "./store";
import { getDeviceId } from "./device";
import { toGallery } from "./utils";

export type MarketMode = "unknown" | "server" | "local";

type UseMarketReturn = {
  mode: MarketMode;
  loading: boolean;
  books: Book[];
  /** 服务端是否开启审核（未配置管理员口令时发布直接上架） */
  reviewEnabled: boolean;
  refresh: () => Promise<void>;
  addBook: (input: BookInput) => Promise<boolean>;
  removeBook: (id: string) => Promise<boolean>;
  toggleSold: (id: string, nextSold: boolean) => Promise<boolean>;
};

/**
 * 双模式市场数据层：
 * - server 模式：/api/books + PostgreSQL，多设备共享数据（乐观更新 + 聚焦刷新）
 * - local  模式：未配置数据库时自动降级为 localStorage（Zustand）
 */
export function useMarket(): UseMarketReturn {
  const localBooks = useStore((s) => s.books);
  const localAdd = useStore((s) => s.addBook);
  const localRemove = useStore((s) => s.removeBook);
  const localToggleSold = useStore((s) => s.toggleSold);

  const [mode, setMode] = useState<MarketMode>("unknown");
  const [serverBooks, setServerBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewEnabled, setReviewEnabled] = useState(true);
  const modeRef = useRef<MarketMode>("unknown");
  modeRef.current = mode;
  const reviewRef = useRef(true);
  reviewRef.current = reviewEnabled;
  /** 首次探测失败后的重试标记（只重试一次，避免网络抖动误入本地模式） */
  const retryingRef = useRef(false);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      // 携带 ownerId：服务端返回「全部已上架 + 自己的待审/驳回书」
      const res = await fetch(
        `/api/books?owner=${encodeURIComponent(getDeviceId())}`,
        { cache: "no-store" }
      );
      const data = (await res.json().catch(() => null)) as {
        enabled?: boolean;
        books?: Book[];
        review?: boolean;
        error?: string;
      } | null;
      // HTTP 非 2xx 视为瞬断，与网络异常同路处理，不用空数据覆盖现有书单
      if (!res.ok || !data) throw new Error(data?.error || "市集服务暂不可用");
      retryingRef.current = false;
      if (data.enabled) {
        setServerBooks(Array.isArray(data.books) ? data.books : []);
        if (typeof data.review === "boolean") setReviewEnabled(data.review);
        if (modeRef.current !== "server") setMode("server");
      } else if (modeRef.current !== "local") {
        setMode("local");
      }
      setLoading(false);
    } catch {
      // 云端会话中遇到数据库瞬断：保留已加载书单，不降级，等下次轮询/聚焦恢复
      if (modeRef.current === "server") {
        setLoading(false);
        return;
      }
      // 首次探测失败：延迟 3s 重试一次，仍失败才进入本地模式
      if (!retryingRef.current) {
        retryingRef.current = true;
        window.setTimeout(() => {
          void refresh();
        }, 3000);
        return; // 保持 loading 骨架屏
      }
      retryingRef.current = false;
      if (modeRef.current !== "local") setMode("local");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (modeRef.current === "server" && document.visibilityState === "visible") {
        void refresh();
      }
    }, 30000);
    const onFocus = () => {
      // 仅页面可见时刷新（visibilitychange 在隐藏时也会触发，无需浪费请求）
      if (modeRef.current === "server" && document.visibilityState === "visible") {
        void refresh();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  const addBook = useCallback(
    async (input: BookInput): Promise<boolean> => {
      if (modeRef.current !== "server") {
        localAdd(input);
        return true;
      }
      const myId = getDeviceId();
      const temp: Book = {
        ...input,
        // 乐观插入的临时书同样把附加图合并为完整图集，保持 Book.images 语义一致
        images: toGallery(input.cover, input.images),
        id: `temp-${Date.now()}`,
        ownerId: myId,
        sold: false,
        status: reviewRef.current ? "PENDING" : "APPROVED",
        createdAt: Date.now(),
      };
      setServerBooks((prev) => [temp, ...prev]);
      try {
        const res = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, ownerId: myId }),
        });
        const data = (await res.json()) as { book?: Book; error?: string };
        if (!res.ok || !data.book) throw new Error(data.error || "发布失败");
        setServerBooks((prev) =>
          prev.map((b) => (b.id === temp.id ? data.book! : b))
        );
        return true;
      } catch (e) {
        setServerBooks((prev) => prev.filter((b) => b.id !== temp.id));
        toast.error(e instanceof Error ? e.message : "发布失败");
        return false;
      }
    },
    [localAdd]
  );

  const removeBook = useCallback(
    async (id: string): Promise<boolean> => {
      if (modeRef.current !== "server") {
        localRemove(id);
        return true;
      }
      const snapshot = serverBooks;
      setServerBooks((prev) => prev.filter((b) => b.id !== id));
      try {
        const res = await fetch(
          `/api/books/${encodeURIComponent(id)}?ownerId=${encodeURIComponent(getDeviceId())}`,
          { method: "DELETE" }
        );
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(data.error || "删除失败");
        return true;
      } catch (e) {
        setServerBooks(snapshot);
        toast.error(e instanceof Error ? e.message : "删除失败");
        return false;
      }
    },
    [localRemove, serverBooks]
  );

  const toggleSold = useCallback(
    async (id: string, nextSold: boolean): Promise<boolean> => {
      if (modeRef.current !== "server") {
        localToggleSold(id);
        return true;
      }
      const snapshot = serverBooks;
      setServerBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, sold: nextSold } : b))
      );
      try {
        const res = await fetch(`/api/books/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerId: getDeviceId(), sold: nextSold }),
        });
        const data = (await res.json()) as { book?: Book; error?: string };
        if (!res.ok || !data.book) throw new Error(data.error || "操作失败");
        setServerBooks((prev) =>
          prev.map((b) => (b.id === id ? data.book! : b))
        );
        return true;
      } catch (e) {
        setServerBooks(snapshot);
        toast.error(e instanceof Error ? e.message : "操作失败");
        return false;
      }
    },
    [localToggleSold, serverBooks]
  );

  return {
    mode,
    loading,
    books: mode === "server" ? serverBooks : localBooks,
    reviewEnabled,
    refresh,
    addBook,
    removeBook,
    toggleSold,
  };
}
