/**
 * 生成微信/OG 分享所需的静态资源（一次性构建脚本，产物提交到 public/）：
 *  - og-default.png   1200×630 首页品牌分享卡（og:image）
 *  - og-square.png    600×600  方形品牌图（微信 DOM 抓图兜底）
 *  - apple-touch-icon.png 180×180
 *  - icon-192.png / icon.png（favicon）
 * 依赖沙箱系统字体（Noto Serif SC / Noto Sans SC），经 sharp(librsvg) 渲染。
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = (p) => path.join(root, "public", p);

const GRADIENTS = [
  ["#2E5D4B", "#6FA287"],
  ["#8A5A38", "#C89B6D"],
  ["#4E4A3A", "#9C9478"],
  ["#5E3023", "#A96A55"],
  ["#3D5A45", "#8FAF97"],
  ["#6B4E71", "#A98FB0"],
  ["#31474E", "#7A9AA2"],
  ["#7A5230", "#B98E5F"],
];

/** 书脊装饰排 */
function spines(x0, baseY, scale = 1) {
  const widths = [30, 24, 34, 26, 22, 32, 25, 30];
  const heights = [150, 118, 165, 130, 108, 158, 122, 140];
  let x = x0;
  let svg = "";
  widths.forEach((w, i) => {
    const h = heights[i] * scale;
    const [c1, c2] = GRADIENTS[i % GRADIENTS.length];
    const bw = w * scale;
    svg += `<rect x="${x}" y="${baseY - h}" width="${bw}" height="${h}" rx="${5 * scale}" fill="url(#g${i})"/>
            <rect x="${x + 4 * scale}" y="${baseY - h + 12 * scale}" width="${bw - 8 * scale}" height="2" rx="1" fill="rgba(255,255,255,.35)"/>`;
    x += bw + 10 * scale;
  });
  return svg;
}

const defs = GRADIENTS.map(
  ([c1, c2], i) =>
    `<linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`
).join("");

/* ---------- 1. og-default.png 1200×630 ---------- */
const ogDefault = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
<defs>${defs}</defs>
<rect width="1200" height="630" fill="#F7F5F1"/>
<text x="880" y="560" font-family="Noto Serif SC" font-weight="900" font-size="560" fill="#EBE6DC">书</text>
<g>
  <text x="72" y="218" font-family="Noto Serif SC" font-weight="900" font-size="150" fill="#292524">书<tspan fill="#166E4E">集</tspan></text>
  <text x="76" y="278" font-family="Noto Sans SC" font-weight="500" font-size="30" letter-spacing="14" fill="#847F77">校园二手书交易市集</text>
</g>
<text x="76" y="382" font-family="Noto Serif SC" font-weight="600" font-size="46" fill="#57534E">发布闲置好书，让好书流动起来。</text>
${spines(76, 560)}
<text x="1124" y="588" text-anchor="end" font-family="Noto Sans SC" font-weight="500" font-size="26" fill="#A8A29E">ys.hijoe.net</text>
</svg>`;

/* ---------- 2. og-square.png 600×600 ---------- */
const ogSquare = `<svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
<defs>${defs}</defs>
<rect width="600" height="600" fill="#166E4E"/>
<rect x="26" y="26" width="548" height="548" rx="10" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2"/>
${spines(60, 470, 0.72)}
<text x="300" y="230" text-anchor="middle" font-family="Noto Serif SC" font-weight="900" font-size="150" fill="#F7FDF9">书集</text>
<text x="300" y="290" text-anchor="middle" font-family="Noto Sans SC" font-weight="400" font-size="28" letter-spacing="10" fill="rgba(255,255,255,.78)">让好书流动起来</text>
</svg>`;

/* ---------- 3. 图标（复用 logo.svg） ---------- */
const logoBuf = readFileSync(out("logo.svg"));
const densityFor = (px) => Math.ceil((px / 30) * 72); // logo viewBox 30×30

for (const [file, px] of [
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon.png", 48],
]) {
  await sharp(logoBuf, { density: densityFor(px) })
    .resize(px, px)
    .png()
    .toFile(out(file));
}

await sharp(Buffer.from(ogDefault)).png().toFile(out("og-default.png"));
await sharp(Buffer.from(ogSquare)).png().toFile(out("og-square.png"));

console.log("share assets generated ✓");
