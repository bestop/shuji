# 易书 · 二手交易市集 📚

一个**简洁优雅**的二手交易市集，专为**微信内打开**而设计：暖纸色底、衬线书名排版、双列卡片瀑布流，全屏适配移动端，也优雅支持桌面端浏览。

**线上地址**：https://ys.hikid.vip（已备案域名）

> 备用地址 https://shuji-book-market.vercel.app 会自动 308 跳转到主域名。

## ✨ 功能

| 模块 | 说明 |
| ---- | ---- |
| 🏠 书架首页 | 搜索（书名/作者/描述）、6 大分类筛选、最新/价低/价高排序 |
| 📇 卡片式浏览 | 双列书卡（移动端）、封面缺省时自动生成渐变素书封 |
| 📕 书籍详情 | 底部抽屉呈现：价格/成色/分类/描述/卖家信息，一键复制微信号联系 |
| ➕ 发布闲置 | 上传实拍图（自动压缩）或自动生成书封；发布前引导完善昵称/微信号 |
| 🔗 微信分享 | 每本书独立落地页 `/book/[id]` + 动态分享卡片图，转发卡片有品牌图与书籍信息，好友点开直达该书 |
| ❤️ 收藏 | 心动好书一键收藏（保存在本机） |
| 👤 我的 | 资料编辑、我的发布（标记已售/重新上架/删除、审核进度徽标）、我的收藏 |
| 🛡️ 管理员审核 | 口令登录管理面板：待审核/已上架/未通过三态流转，驳回可附原因；新发布书籍经审核后上架 |
| ☁️ 云端同步 | PostgreSQL 多设备共享书市数据，30s 自动刷新 + 聚焦刷新 |

## 🧩 双模式数据架构

应用启动时探测 `/api/books`，自动选择运行模式：

- **云端模式**（配置了 Neon 连接串）：书籍数据存独立数据库 **`neon-shuji`**
  （PostgreSQL，独立实例，与其他项目数据库级隔离），任何设备发布的内容全网可见；发布/售出/删除走 REST API，
  服务端校验所有者权限（`ownerId` = 设备 ID），乐观更新 + 失败回滚。
  连接串只认 `SHUJI_DATABASE_URL`（池化读写）+ `SHUJI_DIRECT_URL`（直连建表），详见 `src/lib/db.ts`。
- **本地模式**（未配置数据库）：自动降级为 `localStorage` 持久化（Zustand），
  零后端也能完整体验，适合 Fork 后一键部署。

个人资料（昵称/微信号）与收藏夹始终保存在各设备本地，天然隐私隔离。

## 🛡️ 管理员审核

配置环境变量 `SHUJI_ADMIN_PASSCODE` 后开启（未配置则发布自动上架）：

- 新发布的书籍进入**待审核**队列，审核通过才会在市集展示；发布者可在「我的发布」看到审核进度
- 「我的」页底部有**管理员审核**入口，口令登录后可：通过上架 / 驳回（附原因，展示给发布者）/ 已上架书下架 / 驳回书恢复上架
- 管理员登录态为签名 httpOnly Cookie（7 天），服务端恒定时间比较，无需会话存储

## 🛠 技术栈

- **Next.js 16**（App Router + TypeScript + Route Handlers）
- **Prisma ORM** + **PostgreSQL**（Neon 独立数据库 `neon-shuji`，`public` schema）
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
# 在 .env.local 中配置 SHUJI_DATABASE_URL（池化）与 SHUJI_DIRECT_URL（直连）后：
bunx prisma db push          # 建表（独立库直接用 public schema，无需建 schema）
bun scripts/seed.ts          # 灌入示例数据
bun scripts/switch-status.ts # 数据库健康巡检（书量/审核分布）
```

## ☁️ 部署

### Vercel（推荐）

1. Fork / 推送本仓库到 GitHub
2. 在 [vercel.com/new](https://vercel.com/new) 导入仓库
3. 创建 Neon 数据库，并在项目环境变量中配置：
   - `SHUJI_DATABASE_URL`（池化连接串，运行时读写）
   - `SHUJI_DIRECT_URL`（直连连接串，供 `prisma db push`）
   - `SHUJI_ADMIN_PASSCODE`（可选，配置后开启管理员审核）
4. 直接 Deploy

或使用 CLI：

```bash
npm i -g vercel
vercel link --project shuji-book-market
vercel deploy --prod
```

首次部署后建表与灌数据：

```bash
vercel env pull .env.local          # 拉取连接串
bunx prisma db push                 # 使用 SHUJI_DIRECT_URL（直连）建表
bun scripts/seed.ts
```

## 📁 目录结构

```
src/
├── app/
│   ├── api/books/          # REST API：列表/发布/售出/删除（所有者校验 + 市集审核过滤）
│   ├── api/admin/          # 管理员：登录/会话/全量书单/审核操作（口令 + 签名 Cookie）
│   ├── api/og/book/        # 每本书的动态分享卡片图（Satori 渲染，微信转发缩略图）
│   ├── book/[id]/          # 书籍落地页（分享直达 + 独立标题/og:image，未上架返回 404）
│   ├── layout.tsx          # 全局元信息 / 微信 viewport / Toaster
│   ├── page.tsx            # 主页面（首页 + 我的，视图切换）
│   └── globals.css         # 易书主题（暖纸/墨绿/赭石）+ 中文衬线字体
├── components/
│   ├── book-card.tsx       # 书卡（双列网格）
│   ├── book-cover.tsx      # 封面（图片 or 自动渐变素书封）
│   ├── detail-sheet.tsx    # 详情抽屉（联系卖家/收藏/分享/管理/审核进度提示）
│   ├── share-guide.tsx     # 微信内「···」转发引导浮层（微信外 navigator.share 兑底）
│   ├── publish-sheet.tsx   # 发布抽屉（图片压缩 + 表单 + 资料引导）
│   ├── admin-sheet.tsx     # 管理员审核面板（登录/三态流转/驳回原因）
│   ├── profile-page.tsx    # 我的（资料/发布/收藏管理 + 审核徽标 + 管理员入口）
│   └── bottom-nav.tsx      # 底部导航（中央发布按钮）
└── lib/
    ├── use-market.ts       # 双模式数据层（云端/本地自动切换 + 乐观更新）
    ├── store.ts            # Zustand 本地持久化（资料/收藏/本地模式书架）
    ├── device.ts           # 设备 ID（发布归属与管理鉴权）
    ├── book-server.ts      # 服务端校验与 DTO 映射（含审核字段）
    ├── admin.ts            # 管理员鉴权（口令/签名 Cookie/恒定时间比较）
    ├── db.ts               # 连接解析（仅认 SHUJI_*）+ Prisma 惰性单例
    ├── seed.ts             # 示例书籍数据与工具函数
    ├── image.ts            # 封面压缩 / 剪贴板
    ├── share.ts            # 分享文案与落地链接（微信环境检测）
    └── types.ts            # 领域模型（含 BookStatus）
prisma/schema.prisma        # Book 模型（status/reviewNote/reviewedAt）
scripts/seed.ts             # 幂等种子脚本
scripts/switch-status.ts    # 数据库健康巡检
scripts/approve-existing.ts # 一次性：存量书放行为 APPROVED
scripts/build-share-assets.mjs # 生成品牌分享图/图标（改名或换域名后重跑）
```

## License

MIT
