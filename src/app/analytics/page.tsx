import { prisma } from "@/database/client";
import { PageHeader, Card, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const analytics = await prisma.analytics.findMany({
    orderBy: { measuredAt: "desc" },
    take: 30,
    include: { video: { include: { script: true } } },
  });

  const gradeColor: Record<string, "green" | "blue" | "yellow" | "red" | "gray"> = {
    S: "green",
    A: "green",
    B: "blue",
    C: "yellow",
    D: "red",
  };

  return (
    <div>
      <PageHeader title="分析" description="再生数・登録者・視聴維持率・高評価率・コメント率" />

      <Card>
        <h2 className="font-semibold mb-3">動画別パフォーマンス</h2>
        {analytics.length === 0 ? (
          <p className="text-sm text-slate-500">
            まだ分析データがありません。動画投稿後にAnalyticsAgentがデータを取得します。
          </p>
        ) : (
          <div className="space-y-3">
            {analytics.map((a) => (
              <div key={a.id} className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{a.video.script.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{a.windowLabel}</span>
                    {a.grade && <Badge color={gradeColor[a.grade] ?? "gray"}>{a.grade}</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs text-slate-400 mt-2">
                  <div>再生 {Number(a.views ?? 0).toLocaleString()}</div>
                  <div>高評価 {Number(a.likes ?? 0).toLocaleString()}</div>
                  <div>コメント {Number(a.comments ?? 0).toLocaleString()}</div>
                  <div>維持率 {a.averageViewPercentage ?? "―"}%</div>
                  <div>登録者+{a.subscribersGained ?? 0}</div>
                  <div>Hook {a.hookScore ?? "―"}</div>
                </div>
                {a.improvementNotes && (
                  <p className="text-xs text-slate-500 mt-2">改善案: {a.improvementNotes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
