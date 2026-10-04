import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <BookOpen className="h-10 w-10 text-stone-300" aria-hidden />
      <h1 className="mt-4 font-serif-sc text-lg font-bold text-stone-800">这个页面走丢了</h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-400">
        书摊可能已收摊，或书已下架、链接不完整
      </p>
      <Link
        href="/"
        className="mt-6 flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
      >
        回市集逛逛
      </Link>
    </main>
  );
}
