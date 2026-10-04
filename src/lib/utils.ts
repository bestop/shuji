import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 单本书最多实拍图数（含封面） */
export const MAX_BOOK_IMAGES = 6;

/** 服务端单张图片 dataURL 长度上限（约 375KB 二进制） */
export const MAX_IMAGE_DATAURL_LENGTH = 500_000;

/**
 * 合并封面与附加图为完整图集：封面永远为首张。
 * 仅一张（只有封面）时返回 undefined，与 mapBook 语义一致，
 * 避免在书卡/详情里区分「单图图集」与「仅封面」两种表达。
 */
export function toGallery(
  cover?: string | null,
  extra?: string[] | null
): string[] | undefined {
  const gallery = cover ? [cover, ...(extra ?? [])] : (extra ?? []);
  return gallery.length > 1 ? gallery : undefined;
}
