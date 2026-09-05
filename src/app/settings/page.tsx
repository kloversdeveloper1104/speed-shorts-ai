import { prisma } from "@/database/client";
import { PageHeader, Card } from "@/components/ui";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let channel = await prisma.channel.findFirst();
  if (!channel) {
    channel = await prisma.channel.create({ data: { googleAccountEmail: "kloversmovie@gmail.com" } });
  }

  return (
    <div>
      <PageHeader title="設定" description="自動運用モード・品質基準・投稿頻度・カテゴリなどを設定します" />
      <Card>
        <SettingsForm channel={channel} />
      </Card>
    </div>
  );
}
