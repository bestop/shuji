/**
 * 生产环境实测微信分享闭环：
 * 1) 首页点开一本书 → 详情弹层点「分享」→ 应整页跳转 /book/{id}?share=1
 * 2) 落地页自动弹出「···」转发引导浮层
 * 3) 直接访问 /book/{id}?share=1（无微信 UA）不弹引导；带微信 UA 弹引导
 */
import { chromium } from "playwright";

const BASE = "https://ys.hikid.vip";
const WX_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003137) NetType/WIFI Language/zh_CN";

const ok = (name, cond, extra = "") =>
  console.log(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);

const browser = await chromium.launch();

try {
  // ---- 场景 1：微信 UA 首页 → 书籍详情 → 点分享 → 跳落地页 → 自动引导 ----
  const ctx = await browser.newContext({
    userAgent: WX_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "zh-CN",
  });
  // 授予剪贴板权限，模拟微信内可复制
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });

  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 45000 });

  // 点第一张书卡打开详情弹层
  const card = page.locator("[class*='cursor-pointer'], button, a").filter({ hasText: /¥/ }).first();
  await card.click({ timeout: 15000 });
  await page.waitForTimeout(900); // 等弹层动画

  // 详情弹层内点「分享」按钮（aria-label="分享"）
  const shareBtn = page.locator('[aria-label="分享"]');
  ok("详情弹层出现分享按钮", (await shareBtn.count()) > 0);
  await shareBtn.first().click();

  // 应整页跳转到 /book/{id}?share=1
  await page.waitForURL(/\/book\/.+\?share=1/, { timeout: 15000 });
  ok("点分享后整页跳转落地页", true, page.url());

  // 落地页自动弹出转发引导（延迟 400ms）
  await page.waitForSelector("text=把这本书转发给朋友", { timeout: 6000 });
  ok("落地页自动弹出转发引导", true);
  // 引导浮层内嵌分享卡图（长按直发/保存/识码）
  const cardImg = page.locator('[aria-label="分享引导"] img[src*="/api/og/book/"]');
  ok("引导浮层内嵌分享卡图", (await cardImg.count()) > 0);
  await page.screenshot({ path: "scripts/verify-30-share-guide.png" });

  // 落地页标题 = 书籍独立标题（微信转发卡取它）
  const title = await page.title();
  ok("落地页标题带书名与价格", /《.+》仅售 ¥.+ · 易书/.test(title), title);

  // 引导浮层点「我知道了」可关闭
  await page.click("text=我知道了");
  await page.waitForTimeout(400);
  const guideGone = (await page.locator("text=把这本书转发给朋友").count()) === 0;
  ok("点「我知道了」关闭引导", guideGone);
  await ctx.close();

  // ---- 场景 2：好友视角（微信 UA）直接打开分享卡落地页 → 不应自动弹引导 ----
  const ctx2 = await browser.newContext({
    userAgent: WX_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const p2 = await ctx2.newPage();
  const m = /\/book\/([^?]+)\?/.exec(page.url());
  const bookId = m ? m[1] : "seed-04";
  await p2.goto(`${BASE}/book/${bookId}`, { waitUntil: "networkidle", timeout: 45000 });
  await p2.waitForTimeout(900);
  const noGuide = (await p2.locator("text=把这本书转发给朋友").count()) === 0;
  ok("好友视角打开落地页不弹引导", noGuide);
  await ctx2.close();

  // ---- 场景 3：非微信浏览器访问 ?share=1 → 也不弹微信引导 ----
  const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p3 = await ctx3.newPage();
  await p3.goto(`${BASE}/book/${bookId}?share=1`, { waitUntil: "networkidle", timeout: 45000 });
  await p3.waitForTimeout(900);
  const noGuide3 = (await p3.locator("text=把这本书转发给朋友").count()) === 0;
  ok("非微信 UA 访问 ?share=1 不弹引导", noGuide3);
  await ctx3.close();
} catch (e) {
  ok("流程异常", false, e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
