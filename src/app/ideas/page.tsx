import { prisma } from "@/database/client";
import { PageHeader, Card } from "@/components/ui";
import RunButton from "@/components/RunButton";
import IdeaCard from "@/components/IdeaCard";
import { runGenerateIdeasAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const ideas = await prisma.idea.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <div>
      <PageHeader title="企画" description="IdeaAgentが生成したオリジナル企画候補(100点満点でスコアリング)" />

      <div className="mb-6">
        <RunButton action={runGenerateIdeasAction} label="企画を10個生成" pendingLabel="生成中…(Geminiに問い合わせ中)" />
      </div>

      {ideas.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">まだ企画がありません。上のボタンから生成してください。</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
}
