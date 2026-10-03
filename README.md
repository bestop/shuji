# 书集 · 校园二手书交易市集 📚

一个**简洁优雅**的二手书交易系统，专为**微信内打开**而设计：暖纸色底、衬线书名排版、双列卡片瀑布流，全屏适配移动端，也优雅支持桌面端浏览。

**线上地址（Vercel）**：部署后见下方「部署」部分或 Release 说明。

## ✨ 功能

| 模块 | 说明 |
| ---- | ---- |
| 🏠 书架首页 | 搜索（书名/作者/描述）、6 大分类筛选、最新/价低/价高排序 |
| 📇 卡片式浏览 | 双列书卡（移动端）、封面缺省时自动生成渐变素书封 |
| 📕 书籍详情 | 底部抽屉呈现：价格/成色/分类/描述/卖家信息，一键复制微信号联系 |
| ➕ 发布闲置 | 上传实拍图（自动压缩存储）或自动生成书封、成色/分类/原价、卡片实时预览 |
| ❤️ 收藏 | 心动好书一键收藏 |
| 👤 我的 | 资料编辑（昵称/微信号）、我的发布（标记已售/重新上架/删除）、我的收藏 |

## 🛠 技术栈

- **Next.js 16**（App Router + TypeScript）
- **Tailwind CSS 4** + shadcn/ui（Drawer 交互基于 vaul）
- **Zustand** + `localStorage` 持久化 —— 零后端、零数据库，天然适配 Vercel 免费额度
- **Framer Motion** 微动效、**sonner** 轻提示

> 微信生态适配：安全区（刘海屏/底部横条）、`viewport-fit=cover`、44px 触控热区、
> 去除点击高亮、禁用双指缩放跳动、`format-detection` 防止手机号被识别。

## 🚀 本地开发

```bash
bun install
bun run dev      # http://localhost:3000
bun run lint     # 代码检查
```

## ☁️ 部署

### Vercel（推荐，一键部署）

1. Fork / 推送本仓库到 GitHub
2. 在 [vercel.com/new](https://vercel.com/new) 导入仓库
3. 直接 Deploy（无需任何环境变量）

或使用 CLI：

```bash
npm i -g vercel
vercel deploy --prod
```

### 说明

数据保存在**每台设备的浏览器 localStorage** 中，适合班级/社团/宿舍等小圈子场景：
卖家在群里发出链接，买家打开即可浏览并复制微信号联系。如需多端共享数据，
可平滑升级为 Next.js API Routes + Prisma（PostgreSQL / Neon），架构上已预留。

## 📁 目录结构

```
src/
├── app/
│   ├── layout.tsx          # 全局元信息 / 微信 viewport / Toaster
│   ├── page.tsx            # 主页面（首页 + 我的，视图切换）
│   └── globals.css         # 书集主题（暖纸/墨绿/赭石）+ 中文衬线字体
├── components/
│   ├── book-card.tsx       # 书卡（双列网格）
│   ├── book-cover.tsx      # 封面（图片 or 自动渐变素书封）
│   ├── detail-sheet.tsx    # 详情抽屉（联系卖家/收藏/分享/管理）
│   ├── publish-sheet.tsx   # 发布抽屉（图片压缩 + 表单 + 预览）
│   ├── profile-page.tsx    # 我的（资料/发布/收藏管理）
│   └── bottom-nav.tsx      # 底部导航（中央发布按钮）
└── lib/
    ├── store.ts            # Zustand + localStorage 持久化
    ├── seed.ts             # 示例书籍数据与工具函数
    ├── image.ts            # 封面压缩 / 剪贴板
    └── types.ts            # 领域模型
```

## License

MIT
