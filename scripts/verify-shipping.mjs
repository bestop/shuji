/**
 * 「是否包邮」全链路验证（默认本地 dev，发布/删除测试数据）：
 * 1) API 发布包邮书 + 运费自付书（本地无审核，发布即上架）
 * 2) 详情弹层：包邮绿色标签 / 运费自付灰色标签
 * 3) 市集卡片包邮小标 / 书籍落地页运费标签
 * 4) 卖家书摊页书卡包邮标 / OG 分享卡包邮角标（200 + PNG）
 * 5) 清理测试数据
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000";
const OWNER = "verify-shipping-owner";
const NAME = "运费验证摊主";

const ok = (name, cond, extra = "") =>
  console.log(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);

async function publish(title, freeShipping) {
  const res = await fetch(`${BASE}/api/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      author: "验证作者",
      category: "文学小说",
      condition: "全新",
      price: 9.9,
      description: "运费字段验证用书，验证后删除",
      sellerName: NAME,
      sellerWechat: "verify_shipping",
      ownerId: OWNER,
      freeShipping,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.book) throw new Error(`发布失败: ${res.status} ${JSON.stringify(data)}`);
  return data.book.id;
}

const browser = await chromium.launch();

try {
  const idFree = await publish("包邮验证书", true);
  const idPaid = await publish("自付验证书", false);
  ok("API 发布包邮/自付两本书", true, `${idFree} / ${idPaid}`);

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "zh-CN",
  });
  const page = await ctx.newPage();

  // 详情弹层两种标签
  await page.goto(`${BASE}/?book=${idFree}`, { waitUntil: "networkidle", timeout: 30000 });
  const dialog = page.locator("[role='dialog']").filter({ hasText: "包邮验证书" });
  await dialog.waitFor({ timeout: 15000 });
  ok("详情弹层：包邮书显示绿色包邮标签", (await dialog.locator("text=包邮").count()) > 0);
  ok("详情弹层：不出现「运费自付」", (await dialog.locator("text=运费自付").count()) === 0);

  await page.goto(`${BASE}/?book=${idPaid}`, { waitUntil: "networkidle", timeout: 30000 });
  const dialog2 = page.locator("[role='dialog']").filter({ hasText: "自付验证书" });
  await dialog2.waitFor({ timeout: 15000 });
  ok("详情弹层：自付书显示运费自付标签", (await dialog2.locator("text=运费自付").count()) > 0);

  // 市集卡片包邮小标
  const card = page.locator('button[aria-label="查看《包邮验证书》详情"]');
  ok("市集卡片显示包邮小标", (await card.locator("text=包邮").count()) > 0);

  // 落地页运费标签
  await page.goto(`${BASE}/book/${idFree}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("text=包邮").first().waitFor({ timeout: 10000 });
  ok("书籍落地页显示包邮标签", true);

  // 卖家书摊页书卡包邮标
  await page.goto(
    `${BASE}/seller/${OWNER}?name=${encodeURIComponent(NAME)}`,
    { waitUntil: "networkidle", timeout: 30000 }
  );
  await page.locator("h1", { hasText: `${NAME} 的书摊` }).waitFor({ timeout: 10000 });
  const tile = page.locator('a[aria-label="查看《包邮验证书》详情"]');
  ok("书摊页书卡显示包邮标", (await tile.locator("text=包邮").count()) > 0);
  ok("书摊页统计：正在出售 2 本", (await page.getByText("2 本", { exact: true }).count()) > 0);

  // OG 分享卡
  const ogRes = await fetch(`${BASE}/api/og/book/${idFree}`);
  const type = ogRes.headers.get("content-type") ?? "";
  ok("OG 分享卡 200 + PNG", ogRes.status === 200 && type.includes("image/png"), `${ogRes.status} ${type}`);
  if (ogRes.status === 200) {
    const buf = Buffer.from(await ogRes.arrayBuffer());
    const { writeFile } = await import("node:fs/promises");
    await writeFile("scripts/verify-33-og-shipping.png", buf);
  }
  await ctx.close();

  // 清理测试数据
  const del1 = await fetch(`${BASE}/api/books/${idFree}?ownerId=${OWNER}`, { method: "DELETE" });
  const del2 = await fetch(`${BASE}/api/books/${idPaid}?ownerId=${OWNER}`, { method: "DELETE" });
  ok("测试数据已清理", del1.ok && del2.ok, `${del1.status} / ${del2.status}`);
} catch (e) {
  ok("流程异常", false, e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
