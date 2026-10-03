"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Book, BookInput } from "./types";
import { useStore } from "./store";
import { getDeviceId } from "./device";

export type MarketMode = "unknown" | "server" | "local";

type UseMarketReturn = {
  mode: MarketMode;
  loading: boolean;
  books: Book[];
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
  const modeRef = useRef<MarketMode>("unknown");
  modeRef.current = mode;

  const refresh = useCallback(async () => {
    try {
      // 携带 ownerId：服务端返回「全部已上架 + 自己的待审/驳回书」
      const res = await fetch(
        `/api/books?owner=${encodeURIComponent(getDeviceId())}`,
        { cache: "no-store" }
      );
      const data = (await res.json()) as { enabled?: boolean; books?: Book[] };
      if (data?.enabled) {
        setServerBooks(Array.isArray(data.books) ? data.books : []);
        if (modeRef.current !== "server") setMode("server");
      } else if (modeRef.current !== "local") {
        setMode("local");
      }
    } catch {
      if (modeRef.current !== "local") setMode("local");
    } finally {
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
      if (modeRef.current === "server") void refresh();
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
        id: `temp-${Date.now()}`,
        ownerId: myId,
        sold: false,
        status: "PENDING",
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
    refresh,
    addBook,
    removeBook,
    toggleSold,
  };
}
