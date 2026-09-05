// 企画→台本→音声→映像→字幕→編集→品質チェック→(投稿) までの一連のパイプライン。
// テストモード(仕様書42節)とAUTOモード(仕様書54節)の両方から呼び出される。

import { prisma } from "@/database/client";
import { generateDailyIdeas, getTopPendingIdeas } from "@/agents/idea";
import { generateScript } from "@/agents/script";
import { designAllScenes } from "@/agents/visual";
import { editVideoFromScript } from "@/agents/editor";
import { runQualityCheck } from "@/agents/quality";
import { checkDuplicate, isSimilarTitle } from "@/agents/quality/duplicate";
import { uploadVideoToYoutube } from "@/agents/upload";
import { getRecentUploadedVideoTitles } from "@/youtube/client";
import { notify } from "@/utils/notification";
import { logError } from "@/utils/logger";
import { withRetry } from "@/utils/retry";
import { createJob, type JobType } from "./jobs";

async function trackStage<T>(type: JobType, fn: () => Promise<T | null>): Promise<T | null> {
  const job = await createJob(type);
  const result = await withRetry(`Pipeline:${type}`, fn);
  await prisma.job.update({
    where: { id: job.id },
    data: result
      ? { status: "DONE", finishedAt: new Date() }
      : { status: "FAILED", finishedAt: new Date(), errorMessage: "3回試行しましたが失敗しました" },
  });
  return result;
}

export interface PipelineResult {
  ideaId?: string;
  scriptId?: string;
  videoId?: string;
  qualityScore?: number;
  criticalIssues?: string[];
  passed: boolean;
  uploaded: boolean;
  youtubeVideoId?: string;
  stage: string;
  error?: string;
}

/** 1本のテスト動画を生成する(品質チェックまで。投稿はしない)(仕様書42節) */
export async function generateTestVideo(): Promise<PipelineResult> {
  let stage = "IDEA";
  try {
    let idea = (await getTopPendingIdeas(1))[0];
    if (!idea) {
      await trackStage("IDEA_GENERATE", async () => {
        const ideas = await generateDailyIdeas(10);
        return ideas.length > 0 ? ideas : null;
      });
      idea = (await getTopPendingIdeas(1))[0];
    }
    if (!idea) return { passed: false, uploaded: false, stage, error: "企画を生成できませんでした" };

    stage = "SCRIPT";
    const script = await trackStage("SCRIPT_GENERATE", () => generateScript(idea));
    if (!script) return { passed: false, uploaded: false, stage, ideaId: idea.id, error: "台本を生成できませんでした" };

    stage = "VISUAL";
    await trackStage("ASSET_GENERATE", () => designAllScenes(script.scenes));
    const scriptWithScenes = await prisma.script.findUniqueOrThrow({
      where: { id: script.id },
      include: { scenes: true },
    });

    stage = "EDIT";
    const edit = await trackStage("VIDEO_EDIT", () => editVideoFromScript(scriptWithScenes));
    if (!edit) return { passed: false, uploaded: false, stage, ideaId: idea.id, scriptId: script.id, error: "動画編集に失敗しました" };

    stage = "QUALITY";
    const video = await prisma.video.findUniqueOrThrow({ where: { id: edit.videoId } });
    const quality = await trackStage("QUALITY_CHECK", () => runQualityCheck(video, scriptWithScenes));
    if (!quality) return { passed: false, uploaded: false, stage, ideaId: idea.id, scriptId: script.id, videoId: video.id, error: "品質チェックに失敗しました" };

    return {
      ideaId: idea.id,
      scriptId: script.id,
      videoId: video.id,
      qualityScore: quality.score,
      criticalIssues: quality.issues.filter((i) => i.severity === "critical").map((i) => i.description),
      passed: quality.passed,
      uploaded: false,
      stage: "DONE",
    };
  } catch (err) {
    await logError("Pipeline:generateTestVideo", err, { stage });
    return { passed: false, uploaded: false, stage, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface AutoCycleOptions {
  autoUpload: boolean; // FULL AUTO時のみ true
  privacyStatus: "private" | "unlisted" | "public";
}

/** AUTOコマンドの1サイクル(仕様書54節) */
export async function runAutoCycle(options: AutoCycleOptions): Promise<PipelineResult> {
  const result = await generateTestVideo();
  if (!result.videoId || !result.scriptId) {
    if (result.error) {
      await notify({ title: "動画生成失敗", message: `${result.stage}: ${result.error}`, level: "error" });
    }
    return result;
  }

  // quality.passed (チャンネル別しきい値・重大な懸念点の有無を含む) が唯一の合否判定。
  // ここで別途スコアのみを env の QUALITY_THRESHOLD と比較し直すと、
  // Channel.qualityThreshold(DB)の方が優先されるQualityAgentの判定と食い違い、
  // 実質的にDBの値だけが効いて env 側の変更が無視される事故につながるため一本化する。
  if (!result.passed) {
    const criticalNote = result.criticalIssues?.length
      ? ` / 重大な懸念点: ${result.criticalIssues.join(" / ")}`
      : "";
    await notify({
      title: "品質基準未達のため投稿を見送り",
      message: `スコア${result.qualityScore}点${criticalNote}`,
      level: "warning",
    });
    return result;
  }

  const script = await prisma.script.findUniqueOrThrow({ where: { id: result.scriptId } });
  const scriptWithScenes = await prisma.script.findUniqueOrThrow({
    where: { id: result.scriptId },
    include: { scenes: true },
  });

  const fullText = scriptWithScenes.scenes.map((s) => s.subtitle ?? "").join("");
  const dup = await checkDuplicate(script.title, fullText, script.id);
  if (dup.isDuplicate) {
    await notify({
      title: "重複コンテンツを検出",
      message: `類似度${(dup.similarity * 100).toFixed(0)}% (script:${dup.mostSimilarScriptId}) のため投稿をスキップしました`,
      level: "warning",
    });
    return { ...result, passed: false, error: "重複コンテンツ" };
  }

  if (!options.autoUpload) {
    return result; // SAFEモード: 人間の承認待ち
  }

  // ローカルDBの状態(git履歴の巻き戻し等)だけに頼らない最終防衛ライン:
  // 実際のチャンネルの直近投稿タイトルとも突き合わせる。
  try {
    const liveTitles = await getRecentUploadedVideoTitles(15);
    const liveDup = isSimilarTitle(script.title, liveTitles);
    if (liveDup.isDuplicate) {
      await notify({
        title: "重複コンテンツを検出(実チャンネル比較)",
        message: `類似度${(liveDup.similarity * 100).toFixed(0)}% (既存投稿:「${liveDup.mostSimilarTitle}」) のため投稿をスキップしました`,
        level: "warning",
      });
      return { ...result, passed: false, error: "重複コンテンツ(実チャンネル比較)" };
    }
  } catch (err) {
    // チャンネル取得に失敗してもアップロード自体は続行する(このチェックは追加の安全網であり必須ではない)
    await logError("Pipeline:LiveDuplicateCheck", err, { scriptId: script.id });
  }

  const video = await prisma.video.findUniqueOrThrow({ where: { id: result.videoId } });
  const uploadResult = await uploadVideoToYoutube(video, script, { privacyStatus: options.privacyStatus });

  return {
    ...result,
    uploaded: uploadResult.success,
    youtubeVideoId: uploadResult.youtubeVideoId,
  };
}
