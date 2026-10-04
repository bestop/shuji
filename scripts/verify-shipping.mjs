/**
 * 「是否包邮」全链路验证：
 * - 默认本地 dev 模式（发布/删除测试数据，含发布表单交互断言）
 *   1) 发布表单：运费选择器 → 选包邮预览出现包邮标 → 切回运费自付消失
 *   2) API 发布包邮书 + 运费自付书（本地无审核，发布即上架）
 *   3) 详情弹层：包邮绿色标签 / 运费自付灰色标签
 *   4) 市集卡片包邮小标 / 书籍落地页运费标签
 *   5) 卖家书摊页书卡包邮标 / OG 分享卡包邮角标（200 + PNG）
 *   6) 清理测试数据
 * - VERIFY_MODE=prod 生产只读模式：生产开启审核（POST 进待审队列不可见），
 *   改用种子书 seed-01（包邮 · 南山书屋）/ seed-02（运费自付）做只读断言，不写任何数据
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000";
const PROD = process.env.VERIFY_MODE === "prod";
const OWNER = "verify-shipping-owner";
const NAME = "运费验证摊主";
const OG_SNAPSHOT = PROD ? "scripts/verify-35-prod-shipping.png" : "scripts/verify-33-og-shipping.png";

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
  // 本地模式发布测试书；生产只读模式使用种子书
  const freeBook = PROD
    ? { id: "seed-01", title: "平凡的世界（全三册）", seller: "南山书屋" }
    : { id: await publish("包邮验证书", true), title: "包邮验证书", seller: NAME };
  const paidBook = PROD
    ? { id: "seed-02", title: "人类简史：从动物到上帝", seller: "晚风" }
    : { id: await publish("自付验证书", false), title: "自付验证书", seller: NAME };
  if (PROD) {
    ok("生产只读模式：不发布/不删除任何数据", true, "使用种子书 seed-01（包邮）/ seed-02（自付）");
  } else {
    ok("API 发布包邮/自付两本书", true, `${freeBook.id} / ${paidBook.id}`);
  }

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "zh-CN",
  });
  const page = await ctx.newPage();

  // ── 发布表单：运费选择器交互（仅本地模式，避免向生产写数据）──
  if (!PROD) {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 });
    await page.locator('button[aria-label="发布书籍"]').click();
    const sheet = page.locator("[role='dialog']").filter({ hasText: "发布闲置好书" });
    await sheet.waitFor({ timeout: 10000 });
    const group = sheet.locator('[role="group"][aria-label="运费方式"]');
    ok("发布表单：运费选择器（包邮/运费自付）存在", (await group.count()) === 1);
    await group.locator('button:has-text("包邮")').click();
    ok(
      "发布表单：选包邮后卡片预览出现包邮标",
      (await sheet.locator("span.text-emerald-600", { hasText: "包邮" }).count()) === 1
    );
    await group.locator('button:has-text("运费自付")').click();
    ok(
      "发布表单：切回运费自付后预览包邮标消失",
      (await sheet.locator("span.text-emerald-600", { hasText: "包邮" }).count()) === 0
    );
    await page.keyboard.press("Escape");
  }

  // ── 详情弹层两种标签 ──
  await page.goto(`${BASE}/?book=${freeBook.id}`, { waitUntil: "networkidle", timeout: 30000 });
  const dialog = page.locator("[role='dialog']").filter({ hasText: freeBook.title });
  await dialog.waitFor({ timeout: 15000 });
  ok("详情弹层：包邮书显示绿色包邮标签", (await dialog.locator("text=包邮").count()) > 0);
  ok("详情弹层：不出现「运费自付」", (await dialog.locator("text=运费自付").count()) === 0);

  await page.goto(`${BASE}/?book=${paidBook.id}`, { waitUntil: "networkidle", timeout: 30000 });
  const dialog2 = page.locator("[role='dialog']").filter({ hasText: paidBook.title });
  await dialog2.waitFor({ timeout: 15000 });
  ok("详情弹层：自付书显示运费自付标签", (await dialog2.locator("text=运费自付").count()) > 0);

  // 市集卡片包邮小标
  const card = page.locator(`button[aria-label="查看《${freeBook.title}》详情"]`);
  ok("市集卡片显示包邮小标", (await card.locator("text=包邮").count()) > 0);

  // 落地页运费标签
  await page.goto(`${BASE}/book/${freeBook.id}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("text=包邮").first().waitFor({ timeout: 10000 });
  ok("书籍落地页显示包邮标签", true);

  // 卖家书摊页书卡包邮标
  await page.goto(
    `${BASE}/seller/${PROD ? "seed" : OWNER}?name=${encodeURIComponent(freeBook.seller)}`,
    { waitUntil: "networkidle", timeout: 30000 }
  );
  await page.locator("h1", { hasText: `${freeBook.seller} 的书摊` }).waitFor({ timeout: 10000 });
  const tile = page.locator(`a[aria-label="查看《${freeBook.title}》详情"]`);
  ok("书摊页书卡显示包邮标", (await tile.locator("text=包邮").count()) > 0);
  if (!PROD) {
    ok("书摊页统计：正在出售 2 本", (await page.getByText("2 本", { exact: true }).count()) > 0);
  }

  // OG 分享卡
  const ogRes = await fetch(`${BASE}/api/og/book/${freeBook.id}`);
  const type = ogRes.headers.get("content-type") ?? "";
  ok("OG 分享卡 200 + PNG", ogRes.status === 200 && type.includes("image/png"), `${ogRes.status} ${type}`);
  if (ogRes.status === 200) {
    const buf = Buffer.from(await ogRes.arrayBuffer());
    const { writeFile } = await import("node:fs/promises");
    await writeFile(OG_SNAPSHOT, buf);
  }
  await ctx.close();

  // 清理测试数据（仅本地模式）
  if (!PROD) {
    const del1 = await fetch(`${BASE}/api/books/${freeBook.id}?ownerId=${OWNER}`, { method: "DELETE" });
    const del2 = await fetch(`${BASE}/api/books/${paidBook.id}?ownerId=${OWNER}`, { method: "DELETE" });
    ok("测试数据已清理", del1.ok && del2.ok, `${del1.status} / ${del2.status}`);
  }
} catch (e) {
  ok("流程异常", false, e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
