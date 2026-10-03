import { NextResponse } from "next/server";
import { isAdminRequest, isReviewEnabled } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** 管理员会话状态：功能是否开启 + 当前设备是否已登录 */
export async function GET() {
  return NextResponse.json({
    enabled: isReviewEnabled(),
    isAdmin: await isAdminRequest(),
  });
}
