import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { hasDb, getDb } from "@/lib/db";
import { formatPrice, gradientFor } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 每本书的分享卡片图（1200×630）：
 * 渐变书封底 + 书名/作者/价格 + 易书品牌。
 * 微信转发卡片与 og:image 均指向本路由。
 */

type Params = { params: Promise<{ id: string }> };

let fontCache: ArrayBuffer | null = null;

async function loadFont(req: Request): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  // 优先读打包内字体（outputFileTracingIncludes 已包含），失败则回退自取静态资源
  try {
    const buf = await readFile(
      path.join(process.cwd(), "public", "fonts", "og-noto-serif-sc.ttf")
    );
    fontCache = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength
    );
  } catch {
    const res = await fetch(new URL("/fonts/og-noto-serif-sc.ttf", req.url));
    fontCache = await res.arrayBuffer();
  }
  return fontCache;
}

function clampTitle(s: string, max: number) {
  const t = s.replace(/^《|》$/g, "");
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** 生成指向本书落地页的二维码 PNG data URI；失败返回 null（降级为无码卡片） */
async function buildQr(bookId: string): Promise<string | null> {
  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ys.hikid.vip";
    const png = await QRCode.toBuffer(`${site}/book/${bookId}`, {
      type: "png",
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1c1917ff", light: "#ffffffff" },
    });
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;

  // 书籍信息（查不到/未上架 → 品牌兜底卡）
  let book: {
    title: string;
    author: string;
    category: string;
    price: number;
    freeShipping: boolean;
    sold: boolean;
  } | null = null;
  let ok = false;
  if (hasDb()) {
    try {
      const b = await getDb().book.findUnique({ where: { id } });
      if (b && b.status === "APPROVED") {
        book = b;
        ok = true;
      }
    } catch {
      /* 降级为品牌卡 */
    }
  }

  const font = await loadFont(req);
  const [c1, c2] = gradientFor(id);
  const qr = ok ? await buildQr(id) : null;
  const title = ok ? clampTitle(book!.title, 18) : "易书";
  const author = ok
    ? `${book!.author} 著 · ${book!.category}`
    : "二手交易市集";

  const el = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 84px",
        backgroundImage: `linear-gradient(150deg, ${c1} 0%, ${c2} 100%)`,
        fontFamily: "SerifSC",
        color: "#ffffff",
      }}
    >
      {/* 内边框装饰 */}
      <div
        style={{
          position: "absolute",
          top: 26,
          left: 26,
          right: 26,
          bottom: 26,
          border: "2px solid rgba(255,255,255,0.25)",
          borderRadius: 18,
          display: "flex",
        }}
      />

      {/* 顶栏品牌 */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: 4 }}>
          易书
        </span>
        <span
          style={{
            fontSize: 22,
            letterSpacing: 6,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          二手交易市集
        </span>
      </div>

      {/* 书名与作者 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div
          style={{
            fontSize: 76,
            fontWeight: 600,
            lineHeight: 1.25,
            maxWidth: 980,
          }}
        >
          {`《${title}》`}
        </div>
        <div style={{ fontSize: 30, color: "rgba(255,255,255,0.82)" }}>
          {author}
        </div>
      </div>

      {/* 底栏价格与二维码 */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          {ok && !book!.sold ? (
            <>
              <span style={{ fontSize: 40, fontWeight: 600 }}>¥</span>
              <span style={{ fontSize: 72, fontWeight: 600, letterSpacing: 2 }}>
                {formatPrice(book!.price)}
              </span>
              {book!.freeShipping ? (
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: 2,
                    padding: "8px 26px",
                    border: "2px solid rgba(255,255,255,0.8)",
                    borderRadius: 40,
                    marginLeft: 14,
                  }}
                >
                  包邮
                </span>
              ) : null}
            </>
          ) : (
            <span style={{ fontSize: ok ? 60 : 44, fontWeight: 600, letterSpacing: 4 }}>
              {ok ? "已售出" : "让好书流动起来"}
            </span>
          )}
        </div>
        {qr ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: 12,
              backgroundColor: "#ffffff",
              borderRadius: 14,
            }}
          >
            <img src={qr} width={150} height={150} alt="" />
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: 1,
                color: "#1c1917",
              }}
            >
              长按识别 · 直达本书
            </span>
          </div>
        ) : (
          <span
            style={{
              fontSize: 24,
              letterSpacing: 4,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            易书 · 让好书流动起来
          </span>
        )}
      </div>
    </div>
  );

  const img = new ImageResponse(el, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "SerifSC", data: font, weight: 600, style: "normal" as const },
    ],
  });

  // 转发卡片图可长缓存（书被删除后跳品牌兜底卡）
  return new Response(img.body, {
    headers: {
      "Content-Type": img.headers.get("content-type") ?? "image/png",
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
