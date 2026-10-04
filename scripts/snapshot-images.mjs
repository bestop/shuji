/** 多图功能视觉截图目检：表单多图网格 / 详情图集 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000";
const TITLE = "多图目检书";
const browser = await chromium.launch();

try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "zh-CN",
  });
  const page = await ctx.newPage();

  const pngs = await page.evaluate(() => {
    const colors = ["#8d6e63", "#4db6ac", "#9575cd", "#ffb74d"];
    return colors.map((c) => {
      const cv = document.createElement("canvas");
      cv.width = 120;
      cv.height = 160;
      const g = cv.getContext("2d");
      g.fillStyle = c;
      g.fillRect(0, 0, 120, 160);
      g.fillStyle = "rgba(255,255,255,.85)";
      g.font = "bold 22px sans-serif";
      g.textAlign = "center";
      g.fillText("实拍", 60, 88);
      return cv.toDataURL("image/png").split(",")[1];
    });
  });
  const files = pngs.map((b, i) => ({
    name: `shot-${i}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(b, "base64"),
  }));

  // ① 表单多图网格
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator('button[aria-label="发布书籍"]').click();
  const sheet = page.locator("[role='dialog']").filter({ hasText: "发布闲置好书" });
  await sheet.waitFor({ timeout: 10000 });
  await sheet.locator('input[aria-label="选择实拍图片，可多选"]').setInputFiles(files);
  await page.waitForFunction(
    () => document.querySelector('[data-testid="pic-counter"]')?.textContent === "4/6",
    null,
    { timeout: 30000 }
  );
  await sheet.locator("#p-title").fill(TITLE);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "scripts/verify-36-form-gallery.png" });

  // 发布后在详情里看图集
  await sheet.locator("#p-price").fill("21");
  await sheet.locator("#p-wechat").fill("verify_images");
  await sheet.locator('button:has-text("确认发布")').click();
  await sheet.waitFor({ state: "detached", timeout: 30000 });

  // ② 详情图集
  const deviceId = await page.evaluate(() => localStorage.getItem("shuji-device-id"));
  const list = await (await fetch(`${BASE}/api/books?owner=${encodeURIComponent(deviceId)}`)).json();
  const book = list.books.find((b) => b.title === TITLE);
  await page.goto(`${BASE}/?book=${book.id}`, { waitUntil: "networkidle", timeout: 30000 });
  const dlg = page.locator("[role='dialog']").filter({ hasText: TITLE });
  await dlg.waitFor({ timeout: 15000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="gallery-counter"]')?.textContent === "1/4",
    null,
    { timeout: 15000 }
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: "scripts/verify-37-detail-gallery.png" });

  // ③ 切到第 2 张
  await dlg.locator('button[aria-label="查看第 2 张图片"]').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "scripts/verify-38-detail-gallery-2.png" });

  // 清理
  const del = await fetch(`${BASE}/api/books/${book.id}?ownerId=${encodeURIComponent(deviceId)}`, {
    method: "DELETE",
  });
  console.log(`cleanup: ${del.status}`);
  await ctx.close();
} catch (e) {
  console.error("FAIL:", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
