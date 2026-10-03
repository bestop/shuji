# 书集 · 校园二手书交易市集 📚

一个**简洁优雅**的二手书交易系统，专为**微信内打开**而设计：暖纸色底、衬线书名排版、双列卡片瀑布流，全屏适配移动端，也优雅支持桌面端浏览。

**线上地址**：https://shuji-book-market.vercel.app

## ✨ 功能

| 模块 | 说明 |
| ---- | ---- |
| 🏠 书架首页 | 搜索（书名/作者/描述）、6 大分类筛选、最新/价低/价高排序 |
| 📇 卡片式浏览 | 双列书卡（移动端）、封面缺省时自动生成渐变素书封 |
| 📕 书籍详情 | 底部抽屉呈现：价格/成色/分类/描述/卖家信息，一键复制微信号联系 |
| ➕ 发布闲置 | 上传实拍图（自动压缩）或自动生成书封；发布前引导完善昵称/微信号 |
| ❤️ 收藏 | 心动好书一键收藏（保存在本机） |
| 👤 我的 | 资料编辑、我的发布（标记已售/重新上架/删除）、我的收藏 |
| ☁️ 云端同步 | PostgreSQL 多设备共享书市数据，30s 自动刷新 + 聚焦刷新 |

## 🧩 双模式数据架构

应用启动时探测 `/api/books`，自动选择运行模式：

- **云端模式**（配置了 `POSTGRES_PRISMA_URL`）：书籍数据存 PostgreSQL
  （Vercel + Neon），任何设备发布的内容全网可见；发布/售出/删除走 REST API，
  服务端校验所有者权限（`ownerId` = 设备 ID），乐观更新 + 失败回滚。
- **本地模式**（未配置数据库）：自动降级为 `localStorage` 持久化（Zustand），
  零后端也能完整体验，适合 Fork 后一键部署。

个人资料（昵称/微信号）与收藏夹始终保存在各设备本地，天然隐私隔离。

## 🛠 技术栈

- **Next.js 16**（App Router + TypeScript + Route Handlers）
- **Prisma ORM** + **PostgreSQL**（Neon，多 schema 隔离 `shuji`）
- **Tailwind CSS 4** + shadcn/ui（Drawer 交互基于 vaul）
- **Zustand**（本地模式持久化 + 个人数据）
- **Framer Motion** 微动效、**sonner** 轻提示

> 微信生态适配：安全区（刘海屏/底部横条）、`viewport-fit=cover`、44px 触控热区、
> 去除点击高亮、禁用双指缩放跳动、`format-detection` 防止手机号被识别。

## 🚀 本地开发

```bash
bun install
bun run dev      # http://localhost:3000
bun run lint     # 代码检查

# 数据库（可选，未配置则自动进入本地模式）
# 在 .env 中配置 POSTGRES_PRISMA_URL 后：
bunx prisma db push                          # 建表（需先 CREATE SCHEMA shuji）
DATABASE_URL=<unpooled连接串> bun scripts/seed.ts   # 灌入示例数据
```

## ☁️ 部署

### Vercel（推荐）

1. Fork / 推送本仓库到 GitHub
2. 在 [vercel.com/new](https://vercel.com/new) 导入仓库
3. 创建 Vercel Postgres / Neon 存储并连接项目（环境变量自动注入）
4. 直接 Deploy

或使用 CLI：

```bash
npm i -g vercel
vercel link --project shuji-book-market
vercel storage connect <你的neon存储> --yes
vercel deploy --prod
```

首次部署后建表与灌数据：

```bash
vercel env pull .env.local          # 拉取连接串
CREATE SCHEMA IF NOT EXISTS shuji;  # prisma db execute 或任意 SQL 客户端
bunx prisma db push                 # DATABASE_URL 使用 UNPOOLED 连接串
bun scripts/seed.ts
```

## 📁 目录结构

```
src/
├── app/
│   ├── api/books/          # REST API：列表/发布/售出/删除（所有者校验）
│   ├── layout.tsx          # 全局元信息 / 微信 viewport / Toaster
│   ├── page.tsx            # 主页面（首页 + 我的，视图切换）
│   └── globals.css         # 书集主题（暖纸/墨绿/赭石）+ 中文衬线字体
├── components/
│   ├── book-card.tsx       # 书卡（双列网格）
│   ├── book-cover.tsx      # 封面（图片 or 自动渐变素书封）
│   ├── detail-sheet.tsx    # 详情抽屉（联系卖家/收藏/分享/管理）
│   ├── publish-sheet.tsx   # 发布抽屉（图片压缩 + 表单 + 资料引导）
│   ├── profile-page.tsx    # 我的（资料/发布/收藏管理）
│   └── bottom-nav.tsx      # 底部导航（中央发布按钮）
└── lib/
    ├── use-market.ts       # 双模式数据层（云端/本地自动切换 + 乐观更新）
    ├── store.ts            # Zustand 本地持久化（资料/收藏/本地模式书架）
    ├── device.ts           # 设备 ID（发布归属与管理鉴权）
    ├── book-server.ts      # 服务端校验与 DTO 映射
    ├── db.ts               # Prisma 惰性单例（无数据库时零依赖）
    ├── seed.ts             # 示例书籍数据与工具函数
    ├── image.ts            # 封面压缩 / 剪贴板
    └── types.ts            # 领域模型
prisma/schema.prisma        # Book 模型（shuji schema）
scripts/seed.ts             # 幂等种子脚本
```

## License

MIT
