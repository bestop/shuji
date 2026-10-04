/**
 * 生产环境实测微信分享闭环（sessionStorage 标记版）：
 * 1) 首页点开一本书 → 详情弹层点「分享」→ 整页跳转干净的 /book/{id}（无 ?share=1）
 * 2) 落地页读到会话标记 → 自动弹出转发引导（内嵌卡图）
 * 3) 标记一次性：关闭引导后刷新不再弹出
 * 4) 好友视角（无标记）与非微信 UA 均不弹引导
 */
import { chromium } from "playwright";

const BASE = "https://ys.hikid.vip";
const WX_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003137) NetType/WIFI Language/zh_CN";

const ok = (name, cond, extra = "") =>
  console.log(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);

const browser = await chromium.launch();

try {
  // ---- 场景 1：微信 UA 首页 → 书籍详情 → 点分享 → 干净落地页 → 自动引导 ----
  const ctx = await browser.newContext({
    userAgent: WX_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "zh-CN",
  });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });

  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 45000 });

  const card = page.locator("[class*='cursor-pointer'], button, a").filter({ hasText: /¥/ }).first();
  await card.click({ timeout: 15000 });
  await page.waitForTimeout(900);

  const shareBtn = page.locator('[aria-label="分享"]');
  ok("详情弹层出现分享按钮", (await shareBtn.count()) > 0);
  await shareBtn.first().click();

  // 整页跳转到落地页，且 URL 干净（无 ?share=1）
  await page.waitForURL(/\/book\/[^?]+$/, { timeout: 15000 });
  const cleanUrl = !page.url().includes("?");
  ok("点分享后整页跳转，URL 干净无参数", cleanUrl, page.url());

  // 落地页读到会话标记 → 自动弹出转发引导
  await page.waitForSelector("text=把这本书转发给朋友", { timeout: 6000 });
  ok("落地页自动弹出转发引导", true);
  const cardImg = page.locator('[aria-label="分享引导"] img[src*="/api/og/book/"]');
  ok("引导浮层内嵌分享卡图", (await cardImg.count()) > 0);
  await page.screenshot({ path: "scripts/verify-30-share-guide.png" });

  const title = await page.title();
  ok("落地页标题带书名与价格", /《.+》仅售 ¥.+ · 易书/.test(title), title);

  await page.click("text=我知道了");
  await page.waitForTimeout(400);

  const bookId = /\/book\/([^?]+)/.exec(page.url())?.[1] ?? "seed-04";

  // 标记一次性：关闭后刷新不再弹出（好友收到链接反复打开也不会被打扰）
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  ok("标记一次性：刷新后引导不再弹出", (await page.locator("text=把这本书转发给朋友").count()) === 0);
  await ctx.close();

  // ---- 场景 2：好友视角（微信 UA、无标记）直接打开落地页 → 不弹引导 ----
  const ctx2 = await browser.newContext({
    userAgent: WX_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/book/${bookId}`, { waitUntil: "networkidle", timeout: 45000 });
  await p2.waitForTimeout(900);
  ok("好友视角打开落地页不弹引导", (await p2.locator("text=把这本书转发给朋友").count()) === 0);
  await ctx2.close();

  // ---- 场景 3：非微信浏览器打开 → 不弹微信引导 ----
  const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p3 = await ctx3.newPage();
  await p3.goto(`${BASE}/book/${bookId}`, { waitUntil: "networkidle", timeout: 45000 });
  await p3.waitForTimeout(900);
  ok("非微信 UA 打开不弹引导", (await p3.locator("text=把这本书转发给朋友").count()) === 0);
  await ctx3.close();
} catch (e) {
  ok("流程异常", false, e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
