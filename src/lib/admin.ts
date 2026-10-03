import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * 管理员鉴权（口令 + 签名 Cookie，无需会话存储）：
 * - 口令配置在 SHUJI_ADMIN_PASSCODE（本地 .env.local / Vercel 环境变量）
 * - 登录成功后下发 httpOnly Cookie，值为 sha256(固定盐 + 口令)
 * - 校验时重算签名并恒定时间比较；口令未配置时审核功能视为关闭
 */
export const ADMIN_COOKIE = "shuji_admin";
const TOKEN_SALT = "shuji-admin-v1";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

export function adminPasscode(): string | undefined {
  const p = process.env.SHUJI_ADMIN_PASSCODE;
  const t = p?.trim();
  return t ? t : undefined;
}

export function adminToken(passcode: string): string {
  return createHash("sha256").update(`${TOKEN_SALT}:${passcode}`).digest("hex");
}

/** 恒定时间字符串比较（先哈希定长再比较，防时序侧信道） */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** 当前请求是否为已登录管理员（口令未配置时恒为 false） */
export async function isAdminRequest(): Promise<boolean> {
  const passcode = adminPasscode();
  if (!passcode) return false;
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const expected = adminToken(passcode);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 审核功能是否开启（口令已配置） */
export function isReviewEnabled(): boolean {
  return Boolean(adminPasscode());
}

/** 登录成功后设置管理员 Cookie */
export function setAdminCookie(res: import("next/server").NextResponse): void {
  const passcode = adminPasscode();
  if (!passcode) return;
  res.cookies.set(ADMIN_COOKIE, adminToken(passcode), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

/** 退出登录：清除管理员 Cookie */
export function clearAdminCookie(res: import("next/server").NextResponse): void {
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });
}
