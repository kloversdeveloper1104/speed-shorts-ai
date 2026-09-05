import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "YouTube Shorts AI 自動運用システム",
  description: "AIによるYouTube Shorts企画・制作・投稿・分析・改善の自動運用システム",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex bg-slate-950 text-slate-100">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6 md:p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
