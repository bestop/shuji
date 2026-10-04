"use client";

import { useEffect, useRef, useState } from "react";
import { HandCoins, ImagePlus, Loader2, UserRoundPlus, X } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Truck } from "lucide-react";
import { BookCover } from "./book-cover";
import { compressImage } from "@/lib/image";
import { CONDITIONS, CATEGORIES } from "@/lib/types";
import type { BookInput, Condition, Profile } from "@/lib/types";
import { MAX_BOOK_IMAGES, cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  /** 云端模式且开启审核时，发布后进入待审核队列 */
  reviewRequired: boolean;
  onPublish: (input: BookInput) => Promise<boolean>;
  onGoProfile: () => void;
};

const inputCls =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-[15px] text-stone-800 placeholder:text-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function PublishSheet({ open, onOpenChange, profile, reviewRequired, onPublish, onGoProfile }: Props) {

  const [pics, setPics] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState<string>("文学小说");
  const [condition, setCondition] = useState<Condition>("几乎全新");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [freeShipping, setFreeShipping] = useState(false);
  const [description, setDescription] = useState("");
  const [wechat, setWechat] = useState(profile.wechatId);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setWechat(profile.wechatId);
  }, [open]);

  const resetForm = () => {
    setPics([]);
    setTitle("");
    setAuthor("");
    setCategory("文学小说");
    setCondition("几乎全新");
    setPrice("");
    setOriginalPrice("");
    setFreeShipping(false);
    setDescription("");
  };

  /** 多选追加图片：逐张校验→压缩→追加，超出上限的文件提示并忽略 */
  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const room = MAX_BOOK_IMAGES - pics.length;
    if (room <= 0) {
      toast.error(`最多上传 ${MAX_BOOK_IMAGES} 张图片`);
      return;
    }
    if (files.length > room) {
      toast.error(`最多上传 ${MAX_BOOK_IMAGES} 张图片`, {
        description: `还能再选 ${room} 张，已自动选取前 ${room} 张`,
      });
    }

    setCompressing(true);
    const added: string[] = [];
    for (const file of files.slice(0, room)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`「${file.name}」不是图片，已跳过`);
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`「${file.name}」超过 8MB，已跳过`);
        continue;
      }
      try {
        added.push(await compressImage(file));
      } catch {
        toast.error(`「${file.name}」处理失败，已跳过`);
      }
    }
    if (added.length) {
      setPics((prev) => [...prev, ...added].slice(0, MAX_BOOK_IMAGES));
    }
    setCompressing(false);
  };

  /** 移除第 i 张（若移除的是封面，下一张自动顶上成为新封面） */
  const removePic = (i: number) => {
    setPics((prev) => prev.filter((_, idx) => idx !== i));
  };

  /** 将第 i 张设为封面（移到最前） */
  const makeCover = (i: number) => {
    setPics((prev) => {
      if (i <= 0 || i >= prev.length) return prev;
      const next = [...prev];
      const [picked] = next.splice(i, 1);
      return [picked, ...next];
    });
  };

  const handleSubmit = async () => {
    const t = title.trim();
    const p = Number(price);
    const op = originalPrice.trim() ? Number(originalPrice) : undefined;
    const w = wechat.trim();

    if (!t) return toast.error("请填写书名");
    if (t.length > 40) return toast.error("书名过长，请精简一下");
    if (!price.trim() || Number.isNaN(p) || p <= 0 || p > 99999)
      return toast.error("请填写正确的出售价");
    if (op !== undefined && (Number.isNaN(op) || op < 0))
      return toast.error("原价格式不正确");
    if (!w) return toast.error("请填写你的微信号", { description: "方便买家直接联系你" });

    setSubmitting(true);
    try {
      // 入参约定：cover = 第一张（封面），images = 附加图（不含封面，最多 5 张）
      const ok = await onPublish({
        title: t,
        author: author.trim() || "佚名",
        category,
        condition,
        price: Math.round(p * 100) / 100,
        originalPrice: op,
        freeShipping,
        description: description.trim(),
        cover: pics[0],
        images: pics.slice(1),
        sellerName: profile.nickname || "书友",
        sellerWechat: w,
      });
      if (!ok) return; // 失败提示已由数据层展示，保留表单内容
      toast.success(
        reviewRequired ? "已提交审核 🎉" : "发布成功 🎉",
        {
          description: reviewRequired
            ? `《${t}》审核通过后将上架展示，可在「我的发布」查看进度`
            : `《${t}》已上架易书`,
        }
      );
      resetForm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto h-[92vh] max-w-lg rounded-t-2xl">
        <DrawerTitle className="sr-only">发布二手书</DrawerTitle>
        <div className="flex h-full min-h-0 flex-col">
          {/* 标题栏 */}
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
            <span className="w-8" />
            <h2 className="font-serif-sc text-base font-bold text-stone-900">发布闲置好书</h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 表单 */}
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">
            {/* ① 资料完善引导 */}
            {!profile.wechatId ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50 p-3.5">
                <UserRoundPlus className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-amber-800">
                    建议先完善资料再发布
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-amber-700/90">
                    在「我的」设置昵称与微信号后，发布会自动填入，买家也能准确找到你
                  </p>
                  <button
                    type="button"
                    onClick={onGoProfile}
                    className="mt-2 rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
                  >
                    去完善（10 秒搞定）
                  </button>
                </div>
              </div>
            ) : null}

            {/* 图片（最多 6 张，第一张为封面） */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label className="text-[13px] font-semibold text-stone-700">
                  图片{" "}
                  <span className="font-normal text-stone-400">
                    （最多 {MAX_BOOK_IMAGES} 张，不上传则自动生成素雅书封）
                  </span>
                </label>
                <span
                  className="text-[11px] tabular-nums text-stone-400"
                  data-testid="pic-counter"
                >
                  {pics.length}/{MAX_BOOK_IMAGES}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {pics.map((src, i) => (
                  <div
                    key={`${i}-${src.slice(-24)}`}
                    className="group relative aspect-square"
                  >
                    <img
                      src={src}
                      alt={`第 ${i + 1} 张实拍图`}
                      className="h-full w-full rounded-lg border border-stone-200 object-cover"
                    />
                    {i === 0 ? (
                      <span
                        className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm"
                        data-testid="cover-badge"
                      >
                        封面
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => makeCover(i)}
                        className="absolute inset-x-1.5 bottom-1.5 rounded bg-stone-950/55 py-1 text-[10px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-stone-950/75"
                        aria-label={`将第 ${i + 1} 张设为封面`}
                      >
                        设为封面
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePic(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-stone-800 text-white shadow-md transition-colors hover:bg-stone-700"
                      aria-label={`移除第 ${i + 1} 张图片`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {pics.length < MAX_BOOK_IMAGES ? (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={compressing}
                    className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 bg-stone-50 text-stone-400 transition-colors hover:border-primary/50 hover:text-primary"
                    aria-label="添加图片"
                  >
                    {compressing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                    <span className="text-[11px]">
                      {compressing ? "处理中…" : "添加图片"}
                    </span>
                  </button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFiles}
                aria-label="选择实拍图片，可多选"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
                {pics.length > 1
                  ? "点击图片上的「设为封面」可更换列表展示图，第一张为封面"
                  : "多传几张实物照片（书角、内页、笔记），买家更放心"}
              </p>
            </div>

            {/* 书名 / 作者 */}
            <div className="space-y-3">
              <div>
                <label htmlFor="p-title" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                  书名 <span className="text-[#C2540A]">*</span>
                </label>
                <input
                  id="p-title"
                  className={inputCls}
                  placeholder="例：平凡的世界（全三册）"
                  value={title}
                  maxLength={40}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="p-author" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                  作者
                </label>
                <input
                  id="p-author"
                  className={inputCls}
                  placeholder="例：路遥"
                  value={author}
                  maxLength={30}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>
            </div>

            {/* 分类 */}
            <div>
              <p className="mb-2 text-[13px] font-semibold text-stone-700">分类</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.filter((c) => c !== "全部").map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                      category === c
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                    )}
                    aria-pressed={category === c}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 成色 */}
            <div>
              <p className="mb-2 text-[13px] font-semibold text-stone-700">成色</p>
              <div className="grid grid-cols-4 gap-2">
                {CONDITIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={cn(
                      "rounded-xl border py-2 text-[12px] transition-colors",
                      condition === c
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                    )}
                    aria-pressed={condition === c}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 价格 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="p-price" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                  出售价 <span className="text-[#C2540A]">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#C2540A]">
                    ¥
                  </span>
                  <input
                    id="p-price"
                    inputMode="decimal"
                    className={cn(inputCls, "pl-7")}
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="p-origin" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                  原价 <span className="font-normal text-stone-400">选填</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                    ¥
                  </span>
                  <input
                    id="p-origin"
                    inputMode="decimal"
                    className={cn(inputCls, "pl-7")}
                    placeholder="0.00"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value.replace(/[^\d.]/g, ""))}
                  />
                </div>
              </div>
            </div>

            {/* 运费 */}
            <div>
              <p className="mb-2 text-[13px] font-semibold text-stone-700">运费</p>
              <div role="group" aria-label="运费方式" className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFreeShipping(true)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[12px] transition-colors",
                    freeShipping
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                  )}
                  aria-pressed={freeShipping}
                >
                  <Truck className="h-3.5 w-3.5" aria-hidden />
                  包邮
                </button>
                <button
                  type="button"
                  onClick={() => setFreeShipping(false)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[12px] transition-colors",
                    !freeShipping
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                  )}
                  aria-pressed={!freeShipping}
                >
                  <HandCoins className="h-3.5 w-3.5" aria-hidden />
                  运费自付
                </button>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
                {freeShipping
                  ? "运费由你承担，买家无需额外支付，成交更快"
                  : "同城交易建议当面验书交付；需邮寄时运费由买家承担"}
              </p>
            </div>

            {/* 描述 */}
            <div>
              <label htmlFor="p-desc" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                宝贝描述
              </label>
              <textarea
                id="p-desc"
                rows={4}
                className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-[15px] leading-relaxed text-stone-800 placeholder:text-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="版本、购买渠道、笔记情况、转让原因……写得越用心，越容易遇到有缘人"
                value={description}
                maxLength={300}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="mt-1 text-right text-[11px] text-stone-400">{description.length}/300</p>
            </div>

            {/* 微信号 */}
            <div>
              <label htmlFor="p-wechat" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                联系微信号 <span className="text-[#C2540A]">*</span>
              </label>
              <input
                id="p-wechat"
                className={inputCls}
                placeholder="买家将复制该微信号与你联系"
                value={wechat}
                maxLength={30}
                onChange={(e) => setWechat(e.target.value)}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
                发布人：{profile.nickname || "书友"} · 可在「我的」页修改昵称
              </p>
            </div>

            {/* 预览 */}
            <div className="rounded-xl bg-stone-50 p-3.5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                卡片预览
              </p>
              <div className="flex gap-3">
                <BookCover
                  bookId="preview"
                  title={title || "书名"}
                  author={author || undefined}
                  cover={pics[0]}
                  className="aspect-[3/4] w-16 rounded-md"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-serif-sc text-sm font-semibold text-stone-800">
                    {title || "书名"}
                  </p>
                  <p className="text-xs text-stone-400">
                    {condition} · {category}
                  </p>
                  <p className="text-sm font-bold text-[#C2540A]">
                    ¥{price || "0"}
                    {freeShipping ? <span className="ml-1.5 text-[10px] font-medium text-emerald-600">包邮</span> : null}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 提交栏 */}
          <div className="border-t border-stone-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "发布中…" : "确认发布"}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
