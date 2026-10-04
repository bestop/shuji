/**
 * 生产目检：发布表单多图网格（选满 6 张 + 封面徽章 + 计数），只读不发布
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "https://ys.hikid.vip";
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  locale: "zh-CN",
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await ctx.newPage();

// 浏览器内生成 6 张不同颜色 PNG
const pngs = await page.evaluate(() => {
  const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];
  return colors.map((c) => {
    const cv = document.createElement("canvas");
    cv.width = 80; cv.height = 80;
    const g = cv.getContext("2d");
    g.fillStyle = c; g.fillRect(0, 0, 80, 80);
    return cv.toDataURL("image/png").split(",")[1];
  });
});
const files = pngs.map((b, i) => ({
  name: `pic-${i}.png`, mimeType: "image/png", buffer: Buffer.from(b, "base64"),
}));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.locator('button[aria-label="发布书籍"]').click();
await page.waitForTimeout(600);

const input = page.locator("input[type='file'][multiple]");
await input.setInputFiles(files);
await page.waitForTimeout(800);
await page.screenshot({ path: "scripts/verify-39-prod-form-grid.png", fullPage: false });

const count = await page.getByText("6/6").count();
const badge = await page.getByText("封面", { exact: true }).count();
console.log(`✅ 目检完成：计数 6/6 = ${count > 0}，封面徽章 = ${badge > 0}（截图 scripts/verify-39-prod-form-grid.png）`);
await browser.close();
