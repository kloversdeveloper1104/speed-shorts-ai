import { prisma } from "@/database/client";
import { PageHeader, Card, Badge, statusColor } from "@/components/ui";

export const dynamic = "force-dynamic";

const STAGES = ["TREND", "IDEA", "SCRIPT", "VOICE", "VISUAL", "EDIT", "QUALITY", "UPLOAD"] as const;

function inferStage(status: string): (typeof STAGES)[number] {
  switch (status) {
    case "DRAFT":
      return "SCRIPT";
    case "EDITING":
      return "EDIT";
    case "REVIEW":
      return "QUALITY";
    case "SCHEDULED":
      return "UPLOAD";
    case "UPLOADED":
      return "UPLOAD";
    default:
      return "SCRIPT";
  }
}

export default async function ProductionPage() {
  const [videos, jobs] = await Promise.all([
    prisma.video.findMany({
      where: { status: { in: ["DRAFT", "EDITING", "REVIEW"] } },
      include: { script: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.job.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div>
      <PageHeader title="制作" description="TREND → IDEA → SCRIPT → VOICE → VISUAL → EDIT → QUALITY → UPLOAD の進行状況" />

      <Card className="mb-6">
        <h2 className="font-semibold mb-3">制作中の動画</h2>
        {videos.length === 0 ? (
          <p className="text-sm text-slate-500">現在制作中の動画はありません。</p>
        ) : (
          <div className="space-y-4">
            {videos.map((v) => {
              const current = inferStage(v.status);
              const currentIdx = STAGES.indexOf(current);
              return (
                <div key={v.id} className="border-b border-slate-800 pb-3">
                  <div className="text-sm mb-2">{v.script.title}</div>
                  <div className="flex gap-1">
                    {STAGES.map((s, idx) => (
                      <div
                        key={s}
                        className={`flex-1 text-center text-[10px] py-1 rounded ${
                          idx < currentIdx
                            ? "bg-emerald-900/60 text-emerald-300"
                            : idx === currentIdx
                              ? "bg-sky-900/60 text-sky-300"
                              : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">ジョブ履歴</h2>
        <div className="space-y-1.5 text-sm">
          {jobs.length === 0 && <p className="text-slate-500">ジョブはまだありません。</p>}
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center justify-between border-b border-slate-800 py-1.5">
              <span>{j.type}</span>
              <div className="flex items-center gap-2">
                {j.retryCount > 0 && <span className="text-xs text-slate-500">retry:{j.retryCount}</span>}
                <Badge color={statusColor(j.status)}>{j.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
