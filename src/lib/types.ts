/** 书籍成色 */
export const CONDITIONS = ["全新", "几乎全新", "轻微使用", "有笔记"] as const;
export type Condition = (typeof CONDITIONS)[number];

/** 书籍分类 */
export const CATEGORIES = [
  "全部",
  "教材教辅",
  "文学小说",
  "科技经管",
  "人文历史",
  "生活艺术",
  "其他",
] as const;

export type Book = {
  id: string;
  /** 书名 */
  title: string;
  /** 作者 */
  author: string;
  /** 分类（不含“全部”） */
  category: string;
  /** 成色 */
  condition: Condition;
  /** 出售价（元） */
  price: number;
  /** 原价（元），可选 */
  originalPrice?: number;
  /** 书籍描述 / 转让原因 */
  description: string;
  /** 封面图 dataURL，未上传时使用生成的渐变封面 */
  cover?: string;
  /** 卖家昵称 */
  sellerName: string;
  /** 卖家微信号 */
  sellerWechat: string;
  /** 发布者设备 ID，"seed" 为示例数据 */
  ownerId: string;
  /** 发布时间戳（ms） */
  createdAt: number;
  /** 是否已售出 */
  sold: boolean;
};

/** 发布书籍的入参 */
export type BookInput = Omit<Book, "id" | "createdAt" | "sold" | "ownerId">;

export type Profile = {
  nickname: string;
  wechatId: string;
};

export type SortKey = "new" | "asc" | "desc";
