// npm run auto のエントリーポイント(仕様書 53, 54節)
// 1. 設定確認 → 2. YouTube認証確認 → 3. API確認 → 4〜17の自動運用ループ

import "dotenv/config";
import { prisma } from "@/database/client";
import { getMissingRequiredEnv, getAutoMode } from "@/utils/env";
import { isYoutubeAuthenticated } from "@/youtube/oauth";
import { collectTrends, collectTrendingChart } from "@/agents/trend";
import { analyzeUnanalyzedVideos } from "@/agents/viral";
import { updateStrategy } from "@/agents/strategy";
import { runAutoCycle } from "./pipeline";
import { testGeminiConnection } from "@/gemini/client";
import { notify } from "@/utils/notification";

async function main() {
  console.log("========================================");
  console.log("YouTube Shorts AI 自動運用システム — AUTO実行");
  console.log("========================================");

  // 1. 設定確認
  const missing = getMissingRequiredEnv();
  if (missing.length > 0) {
    console.error("必須環境変数が不足しています:");
    for (const m of missing) console.error(`  - ${m.key} (${m.label})`);
    console.error("管理画面(npm run dev)のセットアップウィザードから設定してください。");
    process.exit(1);
  }
  console.log("[1/17] 設定確認 OK");

  // 2. YouTube認証確認
  if (!isYoutubeAuthenticated()) {
    console.error("YouTube未認証です。npm run dev で管理画面を開き、/setup からGoogle認証を行ってください。");
    process.exit(1);
  }
  console.log("[2/17] YouTube認証確認 OK");

  // 3. API確認
  const geminiCheck = await testGeminiConnection();
  if (!geminiCheck.ok) {
    console.error(`Gemini API接続に失敗しました: ${geminiCheck.message}`);
    process.exit(1);
  }
  console.log("[3/17] Gemini API確認 OK");

  const channel = (await prisma.channel.findFirst()) ?? (await prisma.channel.create({
    data: { googleAccountEmail: "kloversmovie@gmail.com" },
  }));

  const autoMode = channel.autoMode !== "OFF" ? channel.autoMode : getAutoMode();
  if (autoMode === "OFF") {
    console.log("AUTO_MODEがOFFのため、企画生成までのみ実行します(投稿は行いません)。");
  }

  try {
    console.log("[4/17] トレンド収集中…");
    await collectTrends();
    await collectTrendingChart();

    console.log("[5/17] バズ分析中…");
    await analyzeUnanalyzedVideos(10);

    console.log("[6/17] 戦略分析中…");
    await updateStrategy(channel.id);

    console.log("[7-16/17] 企画→台本→映像→音声→字幕→編集→品質チェック→重複チェック中…");
    const result = await runAutoCycle({
      autoUpload: autoMode === "FULL",
      privacyStatus: "public",
    });

    console.log("[17/17] 完了:", JSON.stringify(result, null, 2));

    if (result.uploaded) {
      console.log(`✓ 投稿完了 (YouTube Video ID: ${result.youtubeVideoId})`);
    } else if (result.passed) {
      console.log("✓ 動画は生成されましたが、SAFEモードのため人間の承認待ちです(管理画面の「動画」ページ)。");
    } else {
      console.log(`✗ 動画は投稿されませんでした (段階: ${result.stage}, 理由: ${result.error ?? "品質基準未達"})`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("AUTO実行中にエラーが発生しました:", message);
    await notify({ title: "AUTO実行エラー", message, level: "error" });
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());
