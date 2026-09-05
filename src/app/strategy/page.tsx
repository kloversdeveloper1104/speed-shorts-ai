import { prisma } from "@/database/client";
import { PageHeader, Card } from "@/components/ui";
import RunButton from "@/components/RunButton";
import { updateStrategyAction } from "@/app/actions";

export const dynamic = "force-dynamic";

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export default async function StrategyPage() {
  const channel = await prisma.channel.findFirst();
  const strategy = channel
    ? await prisma.strategy.findFirst({ where: { channelId: channel.id }, orderBy: { generatedAt: "desc" } })
    : null;

  return (
    <div>
      <PageHeader title="戦略" description="AIが発見した「このチャンネルの勝ちパターン」" />

      {channel && (
        <div className="mb-6">
          <RunButton
            action={updateStrategyAction.bind(null, channel.id)}
            label="勝ちパターンを再分析"
            pendingLabel="分析中…"
          />
        </div>
      )}

      {!strategy ? (
        <Card>
          <p className="text-sm text-slate-500">
            まだ戦略データがありません。投稿済み動画が蓄積されると分析できます。
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <h3 className="font-semibold text-emerald-400 mb-2">勝ちパターン</h3>
            <ul className="text-sm space-y-1 list-disc list-inside text-slate-300">
              {parseList(strategy.winningPatterns).map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="font-semibold text-rose-400 mb-2">負けパターン</h3>
            <ul className="text-sm space-y-1 list-disc list-inside text-slate-300">
              {parseList(strategy.losingPatterns).map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="font-semibold mb-2">得意テーマ / フック</h3>
            <div className="text-sm text-slate-300">
              <div className="mb-1">テーマ: {parseList(strategy.bestTopics).join(" / ")}</div>
              <div>フック: {parseList(strategy.bestHooks).join(" / ")}</div>
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold mb-2">最適な尺・投稿時間・オチ・CTA</h3>
            <div className="text-sm text-slate-300 space-y-1">
              <div>尺: {strategy.bestLength}</div>
              <div>投稿時間: {strategy.bestPostTime}</div>
              <div>オチ: {strategy.bestEnding}</div>
              <div>CTA: {strategy.bestCta}</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
