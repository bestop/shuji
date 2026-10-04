"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Book, Profile } from "./types";
import type { BookInput } from "./types";
import { SEED_BOOKS, genId } from "./seed";
import { getDeviceId } from "./device";
import { toGallery } from "./utils";

type State = {
  books: Book[];
  favoriteIds: string[];
  profile: Profile;
  addBook: (input: BookInput) => Book;
  removeBook: (id: string) => void;
  toggleSold: (id: string) => void;
  toggleFavorite: (id: string) => void;
  updateProfile: (p: Partial<Profile>) => void;
  resetDemo: () => void;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      books: SEED_BOOKS,
      favoriteIds: [],
      profile: { nickname: "爱书的你", wechatId: "" },

      addBook: (input) => {
        // 入参 images 为附加图（不含封面）；本地书籍统一存完整图集
        const gallery = toGallery(input.cover, input.images);
        const book: Book = {
          ...input,
          images: gallery,
          id: genId(),
          createdAt: Date.now(),
          sold: false,
          // 本地模式无审核环节，发布即上架
          status: "APPROVED",
          ownerId: getDeviceId(),
        };
        set({ books: [book, ...get().books] });
        return book;
      },

      removeBook: (id) =>
        set((s) => ({
          books: s.books.filter((b) => b.id !== id),
          favoriteIds: s.favoriteIds.filter((f) => f !== id),
        })),

      toggleSold: (id) =>
        set((s) => ({
          books: s.books.map((b) =>
            b.id === id ? { ...b, sold: !b.sold } : b
          ),
        })),

      toggleFavorite: (id) =>
        set((s) => ({
          favoriteIds: s.favoriteIds.includes(id)
            ? s.favoriteIds.filter((f) => f !== id)
            : [id, ...s.favoriteIds],
        })),

      updateProfile: (p) =>
        set((s) => ({ profile: { ...s.profile, ...p } })),

      resetDemo: () =>
        set({ books: SEED_BOOKS, favoriteIds: [] }),
    }),
    {
      name: "shuji-book-market-v1",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      /** v1 数据使用 mine 字段，迁移为 ownerId（本机发布的书归属于当前设备） */
      migrate: (persisted, version) => {
        const s = persisted as Partial<State> & { books?: (Book & { mine?: boolean })[] };
        if (version < 2 && Array.isArray(s.books)) {
          s.books = s.books.map((b) => {
            const { mine, ...rest } = b;
            return {
              ...rest,
              ownerId: mine ? getDeviceId() : rest.ownerId ?? "seed",
            };
          }) as Book[];
        }
        // v3：引入审核状态，历史书籍默认视为已上架
        if (version < 3 && Array.isArray(s.books)) {
          s.books = s.books.map((b) => ({ ...b, status: b.status ?? "APPROVED" })) as Book[];
        }
        return s as State;
      },
    }
  )
);
