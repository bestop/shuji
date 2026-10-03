import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ys.hijoe.net"
  ),
  title: "书集 · 校园二手书交易市集",
  description:
    "书集是一个简洁优雅的二手书交易系统：发布闲置好书、按分类浏览书单、复制微信号直接联系书友。让好书流动起来。",
  keywords: ["二手书", "校园交易", "书籍买卖", "书集", "闲置书"],
  authors: [{ name: "书集" }],
  icons: {
    icon: [
      { url: "/icon.png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "书集 · 校园二手书交易市集",
    description: "发布闲置好书，让好书流动起来。",
    siteName: "书集",
    type: "website",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "书集 · 校园二手书交易市集",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "书集 · 校园二手书交易市集",
    description: "发布闲置好书，让好书流动起来。",
    images: ["/og-default.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#F7F5F1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="light">
      <head>
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="antialiased bg-background text-foreground">
        {/* 微信分享卡片缩略图兜底：微信抓取页面首张足尺寸真实图片 */}
        <img
          src="/og-square.png"
          alt=""
          width={300}
          height={300}
          aria-hidden
          className="pointer-events-none fixed left-[-9999px] top-0 h-[300px] w-[300px]"
        />
        {children}
        <Toaster position="top-center" richColors visibleToasts={2} />
      </body>
    </html>
  );
}
