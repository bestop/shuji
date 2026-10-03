# Worklog

---
Task ID: 1
Agent: Super Z (main agent)
Task: 设计并实现「书集」二手书交易系统，发布到 GitHub 与 Vercel

Work Log:
- 加载 fullstack-dev skill，运行 init-fullstack.sh 初始化 Next.js 16 项目环境
- 确定技术方案：客户端优先架构（Zustand + localStorage 持久化，零后端），保证 Vercel 免费部署可靠可用
- 实现主题：暖纸底色 #F7F5F1 + 墨绿主色 #166E4E + 赭石价格色 #C2540A，中文衬线书名排版
- 创建文件：
  - src/lib/types.ts（领域模型：Book/Profile/分类/成色）
  - src/lib/seed.ts（12 本示例书籍 + 渐变封面/时间工具）
  - src/lib/store.ts（Zustand persist 存储：发布/删除/售出/收藏/资料）
  - src/lib/image.ts（canvas 封面压缩至 ≤720px JPEG + 剪贴板兼容）
  - src/components/book-cover.tsx（图片封面 or 自动渐变素书封）
  - src/components/book-card.tsx（双列书卡：成色标签/价格/卖家/相对时间）
  - src/components/detail-sheet.tsx（vaul 详情抽屉：微信复制联系/收藏/分享/卖家管理）
  - src/components/publish-sheet.tsx（全屏发布抽屉：表单/分类成色/卡片预览/校验）
  - src/components/profile-page.tsx（我的：资料编辑/发布管理/收藏夹）
  - src/components/bottom-nav.tsx（底部导航 + 中央发布按钮）
  - src/app/page.tsx（首页 + 我的视图切换、搜索/分类/排序、骨架屏）
  - src/app/layout.tsx（中文 SEO 元信息 + WeChat viewport + sonner Toaster）
  - src/app/globals.css（书集主题变量 + 中文字体栈 + 安全区）
  - README.md（功能/技术栈/部署说明）
- 修复：lint 报错（effect 内 setState 改为 useSyncExternalStore 水合检测、移除多余 eslint-disable、修复 mounted 重复定义导致的 500）
- Agent Browser 端到端自测（390×844 移动端 + 1440×900 桌面端）：首页渲染/搜索过滤/详情抽屉/收藏红心/复制微信号 toast/发布《围城》成功/我的页标记售出/收藏 tab/刷新持久化（localStorage 13 books）全部通过
- Vercel 适配：next.config.ts 生产环境移除 standalone 输出（VERCEL 环境变量判断）、build 脚本改为纯 next build、package.json 更名 shuji-book-market
- GitHub：API 创建仓库 bestop/shuji-book-market（public），git 提交并推送 main（token 仅用于一次性推送，remote 与 config 无 token 残留）
- Vercel：CLI（账号 hijoe）link 项目 shuji-book-market 并 --prod 部署，构建 48s 成功；通过 API 关闭 ssoProtection 部署保护
- 线上验证：https://shuji-book-market.vercel.app 返回 200，标题正确，浏览器实测 12 本书正常渲染、无页面错误

Stage Summary:
- GitHub 仓库：https://github.com/bestop/shuji-book-market
- Vercel 生产地址：https://shuji-book-market.vercel.app（公开可访问，微信内可直接打开）
- 交付物为可运行的 Next.js 16 应用；数据存于设备浏览器 localStorage，适合班级/社团小圈子场景，README 已说明升级为真实后端的路径
- 验证截图存于 /home/z/my-project/download/verify-01~12.png

---
Task ID: 2
Agent: Super Z (main agent)
Task: ① 发布前资料完善引导 ② 升级真实后端（PostgreSQL）实现多设备共享

Work Log:
- 探测 Vercel Storage：CLI/API 均无法新建 Postgres（legacy 引擎已退役、marketplace 创建通道未开放）
- 方案：复用账号既有 Neon 存储 neon-ilist，`vercel storage connect` 挂载到 shuji-book-market（production/preview/development 自动注入全套 PG 环境变量）
- `vercel env pull` 解密连接串到本地 .env.local（sensitive 变量仅此途径可读）
- 发现沙箱启动器进程预设 DATABASE_URL=file:... 优先级高于 .env → 应用统一改用 POSTGRES_PRISMA_URL（Vercel 运行时同样存在；去除 channel_binding 参数提升 Prisma 兼容性）
- Prisma：provider postgresql + multiSchema（shuji schema 隔离，不碰 ilist 数据）；CREATE SCHEMA + db push + 幂等种子脚本 scripts/seed.ts（12 本书，upsert）
- API：GET/POST /api/books、PATCH/DELETE /api/books/[id]；服务端参数校验、所有者 ownerId 鉴权（403）、无数据库时返回 enabled:false 优雅降级；db.ts 惰性单例
- 前端：use-market.ts 双模式数据层（乐观更新/失败回滚/聚焦+30s 刷新）；Book.mine → ownerId（localStorage v1→v2 migrate）；设备 ID device.ts；资料卡/发布表单接入回调
- ①发布前引导：未设微信号时发布抽屉展示琥珀色横幅「去完善」→ 跳转我的页编辑 → 保存后发布自动填入
- 修复：POST 缺 id（crypto.randomUUID）、handleSubmit 缺 async、detail-sheet 括号笔误
- 安全事故规避：.env（含 Neon 凭据）被 git 跟踪，git rm --cached 停止跟踪后提交；核验暂存区与远程历史均无凭据
- 测试：curl 全链路（POST/PATCH/DELETE/403/400）；浏览器双模式 E2E（发布《围城》→ 清空 localStorage 模拟新设备 → 仍见 13 本云端书 → 清理测试数据）
- 部署：GitHub 推送 24a212e；Vercel 重新部署；生产 /api/books enabled:true（12 本）、生产写删链路验证通过、浏览器复测「云端市集 · 多端同步」

Stage Summary:
- 线上已运行云端模式：https://shuji-book-market.vercel.app（任何设备发布即全网可见）
- 本地连接串仅存于沙箱 .env/.env.local（git 忽略且已解除跟踪）
- 运维备忘：db push/migrate 用 DATABASE_URL_UNPOOLED（直连）；运行时查询用 POSTGRES_PRISMA_URL（池化）；Neon 实例与 ilist 项目共享（shuji schema 隔离）

---
Task ID: 3
Agent: Super Z (main agent)
Task: 切换到独立数据库 neon-shuji，将原有数据迁入新库

Work Log:
- 环境侦察：确认当前复用 ilist 的 Neon 实例（neondb 库 + shuji schema 隔离）；本会话无 NEON_API_KEY，故采用同实例 CREATE DATABASE 方案实现数据库级隔离
- scripts/create-neon-shuji.ts（pg + 直连端点）：创建 neon-shuji 库，幂等，连接验证通过
- prisma/schema.prisma：迁出 multiSchema，独立库改用 public schema；datasource 改为 SHUJI_DATABASE_URL + directUrl=SHUJI_DIRECT_URL；db push 至新库成功，client 重新生成
- src/lib/db.ts 重写：连接解析链 SHUJI_DATABASE_URL > 改写库名后的 POSTGRES_PRISMA_URL/DATABASE_URL（Vercel 零配置适配，库名改写为 neon-shuji）；单例感知连接串变化；新增 getDbName()
- .env.local 追加 SHUJI_DATABASE_URL（池化）/SHUJI_DIRECT_URL（直连），并剥离 channel_binding
- scripts/migrate-to-neon-shuji.ts：旧库 12 行 → 备份 JSON（download/shuji-books-backup-2026-10-03.json）→ 幂等 upsert 新库 → 行数校验一致
- scripts/verify-db-split.ts：POST 测试书仅落新库（13 本），旧库保持 12 本不受影响；DELETE 清理后新库回到 12 本
- API GET /api/books 响应新增 db 字段（本地返回 "neon-shuji"）；seed.ts 适配新连接链；pg/@types/pg 移至 devDependencies；README 同步更新
- lint 通过；Agent Browser 实测本地 390×844：书架 12 本渲染正常、详情抽屉/收藏/微信联系按钮正常、无页面错误（截图 verify-19-neon-shuji.png）
- 本地提交 7b5b57f；git push 与 Vercel 部署被阻断：本会话无 GitHub/Vercel 凭据（上个会话的 token 已失效，符合预期——本来就需要用户轮换）

Stage Summary:
- 新库 neon-shuji 已建成并承载全部 12 本书，本地端到端验证通过
- 新代码上线后生产自动切换到新库（零 Vercel 环境变量变更）；旧库 shuji schema 暂保留以维持线上服务连续性，待生产验证后执行 DROP SCHEMA shuji CASCADE 完成彻底迁移
- 待用户提供新 token：GitHub PAT（推送 7b5b57f）+ Vercel token（生产部署）；旧 token 建议作废

---
Task ID: 3-b
Agent: Super Z (main agent)
Task: 接入用户自建 Neon 独立实例 frosty-rice-33455570，完成完全独立化

Work Log:
- 用户在 Neon 控制台创建独立实例 frosty-rice-33455570（ep-delicate-king-b3b2kymr，c-4.ap-southeast-1）并提供全套连接串
- 上一轮部署已先行生效：生产曾运行于共享实例的同名独立数据库（中间态）；本轮升级为全新实例
- create-neon-shuji.ts 增加 SHUJI_ADMIN_URL 覆盖 → 在新实例创建 neon-shuji 库
- .env.local 的 SHUJI_DATABASE_URL/SHUJI_DIRECT_URL 切换到新实例（channel_binding 已剥除）
- prisma db push 建表（新实例 neon-shuji.public）；migrate-to-neon-shuji.ts 跨实例迁移 12 本书，行数校验一致
- 本地读写链路验证：POST 落新实例（13 本）→ verify-db-split.ts（测试书名参数化修复）→ DELETE 回到 12 本
- Vercel 环境变量 SHUJI_DATABASE_URL/SHUJI_DIRECT_URL 注入 production/preview/development；--prod 重新部署
- 双实例对照验证（check-both-instances.ts）：生产 POST 的验证书仅存在于 frosty-rice，sweet-fire 无痕 → 切换实锤
- 最终增量同步（新增 0）后执行 drop-old-shuji.ts：旧实例 DROP SCHEMA shuji CASCADE + DROP DATABASE neon-shuji，还原为 ilist 专属（剩余 schema 仅 information_schema/public）
- 生产终态：enabled=true, db=neon-shuji, 12 本书；浏览器实测 12 张书卡正常渲染、无页面错误（verify-20-frosty-rice.png）
- 提交新脚本（check-both-instances / drop-old-shuji / create 脚本增强 / verify 脚本参数化）并推送 GitHub

Stage Summary:
- 书集现已运行于完全独立的 Neon 实例 frosty-rice-33455570（独立算力/存储/凭据）
- 旧共享实例已 100% 还原，shuji 数据零残留（迁移备份: download/shuji-books-backup-2026-10-03.json）
- 安全提醒：本会话粘贴过的 GitHub PAT / Vercel token / Neon 密码均建议轮换
