import { prisma } from "@/database/client";
import { PageHeader, Card } from "@/components/ui";
import VideoRow from "@/components/VideoRow";

export const dynamic = "force-dynamic";

const GROUPS: { status: string[]; label: string }[] = [
  { status: ["DRAFT", "EDITING"], label: "下書き" },
  { status: ["REVIEW"], label: "レビュー待ち" },
  { status: ["SCHEDULED"], label: "予約" },
  { status: ["UPLOADED"], label: "投稿済み" },
  { status: ["FAILED"], label: "失敗" },
];

export default async function VideosPage() {
  const videos = await prisma.video.findMany({
    include: { script: true, upload: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="動画" description="下書き・レビュー・予約・投稿済み・失敗の一覧" />

      <div className="space-y-6">
        {GROUPS.map((group) => {
          const items = videos.filter((v) => group.status.includes(v.status));
          return (
            <Card key={group.label}>
              <h2 className="font-semibold mb-3">
                {group.label} <span className="text-slate-500 font-normal">({items.length})</span>
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-slate-500">なし</p>
              ) : (
                <div className="space-y-2">
                  {items.map((v) => (
                    <VideoRow key={v.id} video={v} />
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
