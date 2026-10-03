import { NextResponse } from "next/server";
import { adminPasscode, safeEqual, setAdminCookie } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** 管理员登录：口令正确则下发签名 Cookie（7 天有效） */
export async function POST(req: Request) {
  const passcode = adminPasscode();
  if (!passcode) {
    return NextResponse.json({ error: "未开启管理员审核功能" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { passcode?: unknown };
  const input = typeof body.passcode === "string" ? body.passcode.trim() : "";
  if (!input || !safeEqual(input, passcode)) {
    return NextResponse.json({ error: "口令不正确" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  setAdminCookie(res);
  return res;
}
