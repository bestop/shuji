import Link from "next/link";
import { BookX } from "lucide-react";

export default function BookNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-xs rounded-2xl border border-stone-200/60 bg-white p-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-50">
          <BookX className="h-6 w-6 text-stone-300" aria-hidden />
        </span>
        <p className="font-serif-sc text-lg font-bold text-stone-800">
          这本书已下架或不存在
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-stone-400">
          可能已被书友售出删除，去市集看看其他好书吧
        </p>
        <Link
          href="/"
          className="mt-5 flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          返回易书市集
        </Link>
      </div>
    </main>
  );
}
