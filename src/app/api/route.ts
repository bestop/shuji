import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    app: "易书 · 二手交易市集",
    ok: true,
    endpoints: ["/api/books", "/api/books/[id]", "/api/admin/*", "/api/og/book/[id]"],
  });
}
