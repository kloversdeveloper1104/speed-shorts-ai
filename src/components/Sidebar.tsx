import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", icon: "📊" },
  { href: "/trends", label: "トレンド", icon: "🔥" },
  { href: "/ideas", label: "企画", icon: "💡" },
  { href: "/production", label: "制作", icon: "🎬" },
  { href: "/videos", label: "動画", icon: "📹" },
  { href: "/analytics", label: "分析", icon: "📈" },
  { href: "/strategy", label: "戦略", icon: "🧭" },
  { href: "/settings", label: "設定", icon: "⚙️" },
  { href: "/logs", label: "ログ", icon: "📝" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-900/50 min-h-screen">
      <div className="p-5 border-b border-slate-800">
        <Link href="/setup" className="block">
          <div className="font-bold text-sm leading-tight">YouTube Shorts</div>
          <div className="text-xs text-slate-400">AI 自動運用システム</div>
        </Link>
      </div>
      <nav className="p-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-3 mt-2">
        <Link
          href="/setup"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-amber-300 hover:bg-slate-800 transition-colors"
        >
          <span>🧩</span>
          <span>初回セットアップ</span>
        </Link>
      </div>
    </aside>
  );
}
