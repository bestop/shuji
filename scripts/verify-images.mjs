/**
 * 「多图上传（最多 6 张）」全链路验证：
 * - 默认本地 dev 模式（发布/删除测试数据）：
 *   1) 发布表单：一次选 7 张只收 6 张 + 超量 toast + 计数 6/6 + 添加按钮隐藏
 *   2) 表单交互：封面徽章 / 设为封面（第 4 张移到首位）/ 移除后计数与添加按钮恢复
 *   3) API 契约：列表瘦身（images 不下发、imageCount=5），详情接口返回完整图集
 *   4) 详情弹层：图集 1/5 计数、5 张缩略图、点缩略图切换主图
 *   5) 市集卡片「5图」角标 / 书籍落地页实拍图横滑条 5 张
 *   6) 清理：详情内删除验证书
 * - VERIFY_MODE=prod 生产只读模式：仅断言表单结构与单图书无回归，不写任何数据
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000";
const PROD = process.env.VERIFY_MODE === "prod";
const TITLE = "多图验证书";

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

  // ── 浏览器内生成 7 张不同颜色的 80×80 PNG（无需落盘）──
  const pngs = await page.evaluate(() => {
    const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22"];
    return colors.map((c) => {
      const cv = document.createElement("canvas");
      cv.width = 80;
      cv.height = 80;
      const g = cv.getContext("2d");
      g.fillStyle = c;
      g.fillRect(0, 0, 80, 80);
      return cv.toDataURL("image/png").split(",")[1];
    });
  });
  const files = pngs.map((b, i) => ({
    name: `pic-${i}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(b, "base64"),
  }));

  // ── 发布表单 ──
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator('button[aria-label="发布书籍"]').click();
  const sheet = page.locator("[role='dialog']").filter({ hasText: "发布闲置好书" });
  await sheet.waitFor({ timeout: 10000 });

  const counter0 = await sheet.locator('[data-testid="pic-counter"]').textContent();
  ok("表单：初始计数 0/6", counter0 === "0/6", counter0);
  ok(
    "表单：添加图片按钮与多选输入存在",
    (await sheet.locator('button[aria-label="添加图片"]').count()) === 1 &&
      (await sheet.locator('input[aria-label="选择实拍图片，可多选"]').count()) === 1
  );

  await sheet.locator('input[aria-label="选择实拍图片，可多选"]').setInputFiles(files);
  await page.waitForFunction(
    () => document.querySelector('[data-testid="pic-counter"]')?.textContent === "6/6",
    null,
    { timeout: 30000 }
  );
  ok("表单：一次选 7 张只收 6 张（计数 6/6）", true);
  ok(
    "表单：达上限后添加按钮隐藏",
    (await sheet.locator('button[aria-label="添加图片"]').count()) === 0
  );
  ok(
    "表单：超量 toast 提示「最多上传 6 张」",
    (await page.locator("[data-sonner-toast]", { hasText: "最多上传 6 张" }).count()) > 0
  );
  ok("表单：第一张带封面徽章", (await sheet.locator('[data-testid="cover-badge"]').count()) === 1);

  // 设为封面：第 4 张移到首位
  const fourthSrc = await sheet.locator('img[alt="第 4 张实拍图"]').getAttribute("src");
  await sheet.locator('button[aria-label="将第 4 张设为封面"]').click();
  const firstSrc = await sheet.locator('img[alt="第 1 张实拍图"]').getAttribute("src");
  ok("表单：点击「设为封面」后第 4 张移到首位", fourthSrc === firstSrc);

  // 移除第 2 张：计数 5/6，添加按钮恢复
  await sheet.locator('button[aria-label="移除第 2 张图片"]').click();
  const counter5 = await sheet.locator('[data-testid="pic-counter"]').textContent();
  ok("表单：移除后计数 5/6 且添加按钮恢复", counter5 === "5/6" && (await sheet.locator('button[aria-label="添加图片"]').count()) === 1);

  if (PROD) {
    // 生产只读：到此为止，不向生产写数据
    await page.keyboard.press("Escape");
    ok("生产只读模式：不发布/不删除任何数据", true);

    // 单图书详情无回归（seed-01 渐变封面 → 不出现图集区）
    await page.goto(`${BASE}/?book=seed-01`, { waitUntil: "networkidle", timeout: 30000 });
    const dlg = page.locator("[role='dialog']").filter({ hasText: "平凡的世界" });
    await dlg.waitFor({ timeout: 15000 });
    await page.waitForTimeout(800);
    ok(
      "生产：单图书详情不出现图集计数（无回归）",
      (await dlg.locator('[data-testid="gallery-counter"]').count()) === 0
    );
  } else {
    // ── 发布 ──
    await sheet.locator("#p-title").fill(TITLE);
    await sheet.locator("#p-price").fill("19.9");
    await sheet.locator("#p-wechat").fill("verify_images");
    await sheet.locator('button:has-text("确认发布")').click();
    await sheet.waitFor({ state: "detached", timeout: 30000 });
    ok("表单：发布成功（抽屉关闭）", true);

    // ── API 契约 ──
    const deviceId = await page.evaluate(() => localStorage.getItem("shuji-device-id"));
    const list = await (await fetch(`${BASE}/api/books?owner=${encodeURIComponent(deviceId)}`)).json();
    const book = list.books.find((b) => b.title === TITLE);
    if (!book) throw new Error("发布后未在列表中找到验证书");
    ok(
      "API：列表瘦身（images 不下发、imageCount=5）",
      book.images === undefined && book.imageCount === 5,
      `imageCount=${book.imageCount}`
    );
    const detail = await (await fetch(`${BASE}/api/books/${book.id}?owner=${encodeURIComponent(deviceId)}`)).json();
    ok(
      "API：详情接口返回完整图集 5 张",
      Array.isArray(detail.book?.images) && detail.book.images.length === 5,
      `${detail.book?.images?.length ?? 0} 张`
    );

    // ── 详情弹层图集 ──
    await page.goto(`${BASE}/?book=${book.id}`, { waitUntil: "networkidle", timeout: 30000 });
    const dlg = page.locator("[role='dialog']").filter({ hasText: TITLE });
    await dlg.waitFor({ timeout: 15000 });
    await page.waitForFunction(
      () => document.querySelector('[data-testid="gallery-counter"]')?.textContent === "1/5",
      null,
      { timeout: 15000 }
    );
    ok("详情：图集计数 1/5（按需拉取完成）", true);
    ok(
      "详情：缩略图条 5 张",
      (await dlg.locator('[data-testid="gallery-thumbs"] button').count()) === 5
    );
    const mainBefore = await dlg.locator('[data-testid="gallery-main"]').getAttribute("src");
    await dlg.locator('button[aria-label="查看第 3 张图片"]').click();
    const counterNow = await dlg.locator('[data-testid="gallery-counter"]').textContent();
    const mainAfter = await dlg.locator('[data-testid="gallery-main"]').getAttribute("src");
    ok("详情：点缩略图切换主图（3/5）", counterNow === "3/5" && mainAfter !== mainBefore);

    // ── 市集卡片角标 ──
    await page.keyboard.press("Escape");
    const card = page.locator(`button[aria-label="查看《${TITLE}》详情"]`);
    await card.waitFor({ timeout: 10000 });
    ok(
      "市集卡片：多图角标「5图」",
      (await card.locator('[data-testid="image-count-chip"]', { hasText: "5图" }).count()) === 1
    );

    // ── 落地页实拍图横滑条 ──
    await page.goto(`${BASE}/book/${book.id}`, { waitUntil: "networkidle", timeout: 30000 });
    const strip = page.locator('[data-testid="landing-gallery"] img');
    await strip.first().waitFor({ timeout: 10000 });
    ok("落地页：实拍图横滑条 5 张", (await strip.count()) === 5);

    // ── 清理：详情内删除 ──
    await page.goto(`${BASE}/?book=${book.id}`, { waitUntil: "networkidle", timeout: 30000 });
    const dlg2 = page.locator("[role='dialog']").filter({ hasText: TITLE });
    await dlg2.waitFor({ timeout: 15000 });
    await dlg2.getByRole("button", { name: "删除", exact: true }).click();
    await dlg2.getByRole("button", { name: "确认删除" }).click();
    await page.waitForTimeout(1200);
    const after = await (await fetch(`${BASE}/api/books?owner=${encodeURIComponent(deviceId)}`)).json();
    ok("清理：验证书已删除", !after.books.some((b) => b.id === book.id));
  }

  await ctx.close();
} catch (e) {
  ok("流程异常", false, e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
