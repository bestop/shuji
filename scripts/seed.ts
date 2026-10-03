/**
 * 向 Neon PostgreSQL 灌入示例书籍数据（幂等，可重复执行）。
 * 用法：DATABASE_URL=<连接串> bun scripts/seed.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAY = 86400000;
const now = Date.now();

const SEEDS = [
  {
    id: "seed-01",
    title: "平凡的世界（全三册）",
    author: "路遥",
    category: "文学小说",
    condition: "轻微使用",
    price: 25,
    originalPrice: 108,
    description:
      "北京十月文艺出版社的版本，大三读完想传给下一个需要在孙少平身上找力气的人。书脊有轻微折痕，内页干净，仅有少量铅笔划线，可擦。",
    sellerName: "南山书屋",
    sellerWechat: "nanshan_books",
    createdAt: new Date(now - 2 * DAY),
  },
  {
    id: "seed-02",
    title: "人类简史：从动物到上帝",
    author: "[以] 尤瓦尔·赫拉利",
    category: "人文历史",
    condition: "几乎全新",
    price: 30,
    originalPrice: 68,
    description:
      "买了之后先看了电子版，纸质版基本没翻过，九成新。适合对大历史感兴趣的同学，中信出版社精装版，封面很漂亮。",
    sellerName: "晚风",
    sellerWechat: "wanfeng_0421",
    createdAt: new Date(now - 3 * DAY),
  },
  {
    id: "seed-03",
    title: "算法导论（原书第3版）",
    author: "Thomas H. Cormen 等",
    category: "教材教辅",
    condition: "有笔记",
    price: 45,
    originalPrice: 128,
    description:
      "计算机考研上岸了，这本神书留给学弟学妹。前 12 章有铅笔笔记（都是解题思路，很有用），后面章节基本全新。附赠自制目录索引贴。",
    sellerName: "AC不了就摆烂",
    sellerWechat: "acnotme",
    createdAt: new Date(now - 5 * DAY),
  },
  {
    id: "seed-04",
    title: "小王子",
    author: "[法] 圣埃克苏佩里",
    category: "文学小说",
    condition: "几乎全新",
    price: 12,
    originalPrice: 39,
    description:
      "郭宏安译本，装帧是很温柔的米色。一个下午就能读完，但值得每隔几年重读一次。买重复了，出一本。",
    sellerName: "麦田里的守望猫",
    sellerWechat: "wheatcat99",
    createdAt: new Date(now - 1 * DAY),
  },
  {
    id: "seed-05",
    title: "经济学原理（微观经济学分册）",
    author: "[美] 曼昆",
    category: "教材教辅",
    condition: "轻微使用",
    price: 28,
    originalPrice: 98,
    description:
      "北大版曼昆教材，经双学位修完出售。第 1—6 章有荧光笔标注，不影响阅读，课后题答案都写在便签上可以撕掉。",
    sellerName: "芝士土豆",
    sellerWechat: "cheese_potato",
    createdAt: new Date(now - 7 * DAY),
  },
  {
    id: "seed-06",
    title: "百年孤独",
    author: "[哥伦比亚] 加西亚·马尔克斯",
    category: "文学小说",
    condition: "几乎全新",
    price: 22,
    originalPrice: 55,
    description:
      "范晔译本，南海出版公司。读了两章发现自己还没到年纪，看不太进去，转给有缘分的人。希望你也记得带一句：多年以后……",
    sellerName: "布恩迪亚",
    sellerWechat: "macondo_2024",
    createdAt: new Date(now - 4 * DAY),
  },
  {
    id: "seed-07",
    title: "三体（全三册）",
    author: "刘慈欣",
    category: "文学小说",
    condition: "轻微使用",
    price: 40,
    originalPrice: 93,
    description:
      "重庆出版社经典版本，一套三本齐全。第二部黑暗森林反复看过，其余两本一遍。宇宙很大，生活更大，好书应该流动。",
    sellerName: "古筝行动员",
    sellerWechat: "guzheng_action",
    createdAt: new Date(now - 6 * DAY),
  },
  {
    id: "seed-08",
    title: "明朝那些事儿（1—7 部）",
    author: "当年明月",
    category: "人文历史",
    condition: "轻微使用",
    price: 65,
    originalPrice: 358,
    description:
      "全套七本打包出，高中收藏的，保存得很好。当年明月写史像写小说，一口气读完非常爽。适合历史入门，也适合下饭。",
    sellerName: "于谦的父亲",
    sellerWechat: "yudan_father",
    createdAt: new Date(now - 9 * DAY),
  },
  {
    id: "seed-09",
    title: "摄影构图与图像语言",
    author: "[德] 科拉·巴尼克",
    category: "生活艺术",
    condition: "几乎全新",
    price: 35,
    originalPrice: 89,
    description:
      "摄影社淘汰的社团藏书，铜版纸印刷非常精美。从构图基础到进阶视觉语言都有，适合刚入手相机的朋友。",
    sellerName: "快门手",
    sellerWechat: "shutter_hand",
    createdAt: new Date(now - 8 * DAY),
  },
  {
    id: "seed-10",
    title: "被讨厌的勇气",
    author: "[日] 岸见一郎 / 古贺史健",
    category: "科技经管",
    condition: "有笔记",
    price: 18,
    originalPrice: 55,
    description:
      "阿德勒心理学入门。「人生不是与他人的比赛」，这句划了三遍。笔记都在页边，希望下一个翻开它的人也能被治愈。",
    sellerName: "夜航西飞",
    sellerWechat: "nightflight_sf",
    createdAt: new Date(now - 10 * DAY),
  },
  {
    id: "seed-11",
    title: "Word Power Made Easy",
    author: "Norman Lewis",
    category: "教材教辅",
    condition: "轻微使用",
    price: 30,
    originalPrice: 88,
    description:
      "词汇书里的传奇，托福 110 出国前的装备，用完即弃。内有少量笔记和折角，附送自制 Anki 卡组（网盘）。",
    sellerName: "单词裁缝",
    sellerWechat: "vocab_daily",
    createdAt: new Date(now - 12 * DAY),
  },
  {
    id: "seed-12",
    title: "手绘水彩课：从零开始",
    author: "简翊洪",
    category: "生活艺术",
    condition: "全新",
    price: 26,
    originalPrice: 69.8,
    description:
      "买了没时间画，塑封都没拆。全新未拆封，送一支樱花勾线笔。希望它遇到一个真的会坐下画画的人。",
    sellerName: "半亩方塘",
    sellerWechat: "banmutang_01",
    createdAt: new Date(now - 14 * DAY),
    sold: true,
  },
];

async function main() {
  for (const s of SEEDS) {
    const { sold, ...data } = s as (typeof SEEDS)[number] & { sold?: boolean };
    await prisma.book.upsert({
      where: { id: s.id },
      update: {},
      create: {
        ...data,
        sold: Boolean(sold),
        ownerId: "seed",
      },
    });
  }
  const count = await prisma.book.count();
  console.log(`Seed 完成，当前共 ${count} 本书`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
