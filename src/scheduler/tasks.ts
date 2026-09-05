// スケジュールされたタスクの実処理。worker.ts(常駐ループ)とci-run.ts(GitHub Actions単発実行)の
// 両方から呼び出される共通ロジック。importするだけでは何も実行されない(副作用なし)。

import { prisma } from "@/database/client";
import { collectTrends, collectTrendingChart } from "@/agents/trend";
import { analyzeUnanalyzedVideos } from "@/agents/viral";
import { generateDailyIdeas } from "@/agents/idea";
import { runAutoCycle } from "./pipeline";
import { measureAndEvaluate } from "@/agents/analytics";
import { updateStrategy } from "@/agents/strategy";
import { getAutoMode } from "@/utils/env";
import { logError } from "@/utils/logger";

const ANALYTICS_WINDOWS: Array<{ label: "24h" | "48h" | "72h" | "7d"; hours: number }> = [
  { label: "24h", hours: 24 },
  { label: "48h", hours: 48 },
  { label: "72h", hours: 72 },
  { label: "7d", hours: 24 * 7 },
];

export async function runTask(task: string) {
  console.log(`[Scheduler] ${new Date().toISOString()} タスク実行: ${task}`);
  try {
    const channel = (await prisma.channel.findFirst()) ?? (await prisma.channel.create({
      data: { googleAccountEmail: "kloversmovie@gmail.com" },
    }));

    switch (task) {
      case "TREND":
        await collectTrends();
        await collectTrendingChart();
        break;
      case "VIRAL":
        await analyzeUnanalyzedVideos(10);
        break;
      case "IDEA":
        await generateDailyIdeas(10);
        break;
      case "CYCLE": {
        const mode = channel.autoMode !== "OFF" ? channel.autoMode : getAutoMode();
        if (mode === "OFF") break;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todaysUploads = await prisma.upload.count({
          where: { status: "UPLOADED", publishedAt: { gte: todayStart } },
        });
        if (todaysUploads >= channel.maxPostsPerDay) {
          console.log(`[Scheduler] 本日の投稿上限(${channel.maxPostsPerDay}件)に達しているためCYCLEをスキップします。`);
          break;
        }

        await runAutoCycle({ autoUpload: mode === "FULL", privacyStatus: "public" });
        break;
      }
      case "STRATEGY":
        await updateStrategy(channel.id);
        break;
    }
  } catch (err) {
    await logError("Scheduler", err, { task });
  }
}

export async function checkAnalytics() {
  const uploads = await prisma.upload.findMany({
    where: { status: "UPLOADED", youtubeVideoId: { not: null } },
    include: { video: { include: { script: true, analytics: true } } },
  });

  for (const upload of uploads) {
    if (!upload.publishedAt) continue;
    const hoursSince = (Date.now() - upload.publishedAt.getTime()) / (1000 * 60 * 60);

    for (const window of ANALYTICS_WINDOWS) {
      if (hoursSince < window.hours) continue;
      const already = upload.video.analytics.some((a) => a.windowLabel === window.label);
      if (already) continue;

      await measureAndEvaluate(upload.video, upload.video.script, upload, window.label);
    }
  }
}
