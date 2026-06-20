import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "每日全球要闻简报",
  description: "AI 自动采集与筛选全球重要信息，每日 08:01 (BJT) 自动更新。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased min-h-screen">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
