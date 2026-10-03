"use client";

import { Home, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  view: "home" | "profile";
  onHome: () => void;
  onProfile: () => void;
  onPublish: () => void;
};

export function BottomNav({ view, onHome, onProfile, onPublish }: Props) {
  const item = (active: boolean) =>
    cn(
      "flex w-16 flex-col items-center gap-0.5 py-1.5 transition-colors",
      active ? "text-primary" : "text-stone-400 hover:text-stone-600"
    );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/70 bg-white/95 backdrop-blur-md"
      aria-label="底部导航"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 sm:max-w-2xl">
        <button type="button" onClick={onHome} className={item(view === "home")} aria-label="首页" aria-current={view === "home" ? "page" : undefined}>
          <Home className="h-[22px] w-[22px]" aria-hidden />
          <span className="text-[10px]">书架</span>
        </button>

        <button
          type="button"
          onClick={onPublish}
          className="group -mt-5 flex w-16 flex-col items-center"
          aria-label="发布书籍"
        >
          <span className="flex h-13 w-13 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-white transition-all group-active:scale-95 group-hover:bg-primary/90">
            <Plus className="h-6 w-6" aria-hidden />
          </span>
          <span className="mt-0.5 text-[10px] text-stone-400">发布</span>
        </button>

        <button type="button" onClick={onProfile} className={item(view === "profile")} aria-label="我的" aria-current={view === "profile" ? "page" : undefined}>
          <User className="h-[22px] w-[22px]" aria-hidden />
          <span className="text-[10px]">我的</span>
        </button>
      </div>
    </nav>
  );
}
