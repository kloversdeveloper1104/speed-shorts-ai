// GitHub Actions用の単発実行エントリーポイント(PCを消していても自動投稿を続けるため)。
// TASK環境変数(TREND/VIRAL/IDEA/STRATEGY/CYCLE)で指定されたタスクを1回だけ実行して終了する。
// CYCLEのみ、workflow側のcronが「毎時0分」固定のため、ここで0〜15分のランダムジッターを追加する。

import "dotenv/config";
import { prisma } from "@/database/client";
import { runTask, checkAnalytics } from "./tasks";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const task = process.env.TASK;
  if (!task) {
    console.error("TASK環境変数が指定されていません(TREND/VIRAL/IDEA/STRATEGY/CYCLE)。");
    process.exit(1);
  }

  if (task === "CYCLE") {
    const jitterMs = Math.floor(Math.random() * 15 * 60 * 1000); // 0〜15分
    console.log(`[CI] CYCLE実行前に${Math.round(jitterMs / 1000)}秒待機します(ジッター)。`);
    await sleep(jitterMs);
  }

  await runTask(task);
  await checkAnalytics();
}

main()
  .catch((err) => {
    console.error("[CI] 実行中にエラーが発生しました:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
