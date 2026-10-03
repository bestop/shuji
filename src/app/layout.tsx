import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "书集 · 校园二手书交易市集",
  description:
    "书集是一个简洁优雅的二手书交易系统：发布闲置好书、按分类浏览书单、复制微信号直接联系书友。让好书流动起来。",
  keywords: ["二手书", "校园交易", "书籍买卖", "书集", "闲置书"],
  authors: [{ name: "书集" }],
  openGraph: {
    title: "书集 · 校园二手书交易市集",
    description: "发布闲置好书，让好书流动起来。",
    siteName: "书集",
    type: "website",
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
        {children}
        <Toaster position="top-center" richColors visibleToasts={2} />
      </body>
    </html>
  );
}
