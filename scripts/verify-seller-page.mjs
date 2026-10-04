/**
 * 卖家书摊页全流程验证（默认生产环境）：
 * 1) 首页 ?book= 自动弹详情 → 点卖家名字 → 进入 TA 的书摊（在售/已卖出分区、统计、微信号）
 * 2) 书摊点书卡 → 回市集自动弹该书详情
 * 3) 有已卖出记录的摊位（半亩方塘）：在售 0 + 空态、已卖出 1 + 已售出水印
 * 4) 书籍落地页「由 XX 发布」→ 书摊页
 * 5) 不存在的摊位 → 中文 404
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "https://ys.hikid.vip";

const ok = (name, cond, extra = "") =>
  console.log(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);

const browser = await chromium.launch();

try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "zh-CN",
  });
  const page = await ctx.newPage();

  // ---- 场景 1：详情弹层点卖家名字 → 书摊页 ----
  await page.goto(`${BASE}/?book=seed-04`, { waitUntil: "networkidle", timeout: 45000 });
  const dialog = page.locator("[role='dialog']").filter({ hasText: "小王子" });
  await dialog.waitFor({ timeout: 15000 });
  ok("首页 ?book= 自动弹出《小王子》详情", true);

  const sellerLink = dialog.locator('[aria-label="查看 麦田里的守望猫 的书摊"]');
  ok("详情弹层卖家名字可点击（带书摊链接）", (await sellerLink.count()) > 0);
  await sellerLink.click();
  await page.waitForURL(/\/seller\/seed\?name=/, { timeout: 15000 });
  ok("点击后进入卖家书摊页", true, page.url());

  await page.locator("h1", { hasText: "麦田里的守望猫 的书摊" }).waitFor({ timeout: 10000 });
  ok("书摊页标题正确", true);
  ok("统计：正在出售 1 本", (await page.getByText("1 本", { exact: true }).count()) > 0);
  ok("统计：已卖出 0 本", (await page.getByText("0 本", { exact: true }).count()) > 0);
  ok("在售分区展示《小王子》书卡", (await page.locator("a[aria-label='查看《小王子》详情']").count()) > 0);
  ok("已卖出分区空态提示", (await page.getByText("还没有卖出的书记录").count()) > 0);
  ok("微信号胶囊可复制", (await page.locator("[aria-label^='复制卖家微信号']").count()) > 0);
  ok("返回市集入口存在", (await page.locator("[aria-label='返回市集']").count()) > 0);
  await page.screenshot({ path: "scripts/verify-31-seller-page.png", fullPage: true });

  // ---- 场景 2：书摊点书卡 → 回市集弹详情 ----
  await page.locator("a[aria-label='查看《小王子》详情']").click();
  await page.waitForURL(/\/\?book=seed-04/, { timeout: 15000 });
  await dialog.waitFor({ timeout: 15000 });
  ok("书摊点书卡回市集并自动弹出详情", true, page.url());
  await ctx.close();

  // ---- 场景 3：有已卖出记录的摊位 ----
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/seller/seed?name=${encodeURIComponent("半亩方塘")}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  await p2.locator("h1", { hasText: "半亩方塘 的书摊" }).waitFor({ timeout: 10000 });
  ok("已售摊位：在售空态提示", (await p2.getByText("摊位暂时空着，好书画个圈再来逛逛").count()) > 0);
  ok(
    "已卖出分区展示已售水印书卡",
    (await p2.locator("a[aria-label^='查看已售出的《手绘水彩课：从零开始》']").count()) > 0
  );
  await p2.screenshot({ path: "scripts/verify-32-seller-sold.png", fullPage: true });
  await ctx2.close();

  // ---- 场景 4：书籍落地页 → 书摊 ----
  const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p3 = await ctx3.newPage();
  await p3.goto(`${BASE}/book/seed-04`, { waitUntil: "networkidle", timeout: 45000 });
  const landingLink = p3.locator('[aria-label="查看 麦田里的守望猫 的书摊"]');
  ok("落地页「由 XX 发布」带书摊链接", (await landingLink.count()) > 0);
  await landingLink.click();
  await p3.waitForURL(/\/seller\/seed\?name=/, { timeout: 15000 });
  ok("落地页跳转书摊页成功", true, p3.url());
  await ctx3.close();

  // ---- 场景 5：不存在的摊位 → 中文 404 ----
  const ctx4 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p4 = await ctx4.newPage();
  const resp = await p4.goto(`${BASE}/seller/no-such-owner`, { waitUntil: "networkidle", timeout: 45000 });
  ok("不存在摊位返回 404", resp?.status() === 404, `status=${resp?.status()}`);
  ok("404 为中文引导页", (await p4.getByText("这个页面走丢了").count()) > 0);
  await ctx4.close();
} catch (e) {
  ok("流程异常", false, e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
