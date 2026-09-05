import { prisma } from "@/database/client";
import { PageHeader, StatTile, Card, Badge, statusColor } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayVideos, allVideos, recentVideos, channel] = await Promise.all([
    prisma.video.findMany({ where: { createdAt: { gte: todayStart } }, include: { script: true } }),
    prisma.video.findMany({ include: { analytics: true } }),
    prisma.video.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { script: true, upload: true },
    }),
    prisma.channel.findFirst(),
  ]);

  const totalViews = allVideos.reduce((sum, v) => {
    const latest = v.analytics.sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
    return sum + Number(latest?.views ?? 0);
  }, 0);

  const avgViews = allVideos.length > 0 ? Math.round(totalViews / allVideos.length) : 0;
  const maxViews = allVideos.reduce((max, v) => {
    const latest = v.analytics.sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
    return Math.max(max, Number(latest?.views ?? 0));
  }, 0);

  const avgQuality =
    allVideos.filter((v) => v.qualityScore != null).length > 0
      ? Math.round(
          allVideos.reduce((sum, v) => sum + (v.qualityScore ?? 0), 0) /
            allVideos.filter((v) => v.qualityScore != null).length
        )
      : null;

  return (
    <div>
      <PageHeader
        title="ダッシュボード"
        description={`AUTO_MODE: ${channel?.autoMode ?? "OFF"} / チャンネル: ${channel?.title ?? "未設定"}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatTile label="今日の動画" value={todayVideos.length} />
        <StatTile label="総再生数" value={totalViews.toLocaleString()} />
        <StatTile label="平均再生数" value={avgViews.toLocaleString()} />
        <StatTile label="最高再生数" value={maxViews.toLocaleString()} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatTile label="登録者増加(累計)" value="集計中" sub="Analytics API連携後に反映されます" />
        <StatTile label="平均Quality Score" value={avgQuality != null ? `${avgQuality}点` : "―"} />
      </div>

      <Card>
        <h2 className="font-semibold mb-3">最近の動画</h2>
        {recentVideos.length === 0 ? (
          <p className="text-sm text-slate-500">まだ動画がありません。「企画」ページから生成を開始してください。</p>
        ) : (
          <div className="space-y-2">
            {recentVideos.map((v) => (
              <div key={v.id} className="flex items-center justify-between border-b border-slate-800 py-2 text-sm">
                <div className="truncate flex-1">{v.script.title}</div>
                <div className="flex items-center gap-3 shrink-0">
                  {v.qualityScore != null && <span className="text-slate-400">Q:{v.qualityScore}</span>}
                  <Badge color={statusColor(v.status)}>{v.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
