import { prisma } from "@/database/client";
import { PageHeader, Card, Badge } from "@/components/ui";
import RunButton from "@/components/RunButton";
import { runCollectTrendsAction, runViralAnalysisAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const [trends, topVideos] = await Promise.all([
    prisma.trend.findMany({ orderBy: { collectedAt: "desc" }, take: 20 }),
    prisma.sourceVideo.findMany({
      orderBy: { buzzScore: "desc" },
      take: 15,
      include: { analysis: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="トレンド" description="YouTube Shorts市場の急上昇テーマとBuzz Scoreを分析します" />

      <div className="flex gap-3 mb-6">
        <RunButton action={runCollectTrendsAction} label="トレンドを収集" pendingLabel="収集中…" />
        <RunButton action={runViralAnalysisAction} label="バズ動画を構造分析" pendingLabel="分析中…" />
      </div>

      <Card className="mb-6">
        <h2 className="font-semibold mb-3">収集キーワード</h2>
        <div className="space-y-1 text-sm">
          {trends.length === 0 && <p className="text-slate-500">まだトレンドが収集されていません。</p>}
          {trends.map((t) => (
            <div key={t.id} className="flex justify-between border-b border-slate-800 py-1.5">
              <span>{t.keyword}</span>
              <span className="text-slate-400">{t.score}件</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Buzz Score 上位動画(構造分析のみ・複製禁止)</h2>
        <div className="space-y-3">
          {topVideos.length === 0 && <p className="text-slate-500 text-sm">動画がありません。</p>}
          {topVideos.map((v) => (
            <div key={v.id} className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{v.title}</span>
                <Badge color="yellow">Buzz {v.buzzScore}</Badge>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {v.channelTitle} / 再生{Number(v.viewCount).toLocaleString()} / 登録者
                {Number(v.subscriberCount).toLocaleString()}
              </div>
              {v.analysis && (
                <div className="text-xs text-slate-400 mt-1">
                  構造:{v.analysis.hookType} / なぜ伸びたか:{v.analysis.retentionStrategy}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
