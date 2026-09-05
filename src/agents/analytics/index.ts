// AnalyticsAgent: 投稿後のデータを取得・評価する(仕様書 29, 30, 57節)

import { SchemaType } from "@google/generative-ai";
import { generateJson } from "@/gemini/client";
import { getVideoStatistics } from "@/youtube/client";
import { getVideoMetrics } from "@/youtube/analytics";
import { prisma } from "@/database/client";
import { logError } from "@/utils/logger";
import type { Video, Script, Upload } from "@prisma/client";

const EVAL_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    hook_score: { type: SchemaType.NUMBER },
    retention_score: { type: SchemaType.NUMBER },
    topic_score: { type: SchemaType.NUMBER },
    title_score: { type: SchemaType.NUMBER },
    ending_score: { type: SchemaType.NUMBER },
    comment_score: { type: SchemaType.NUMBER },
    conversion_score: { type: SchemaType.NUMBER },
    grade: { type: SchemaType.STRING }, // S/A/B/C/D
    improvement_notes: { type: SchemaType.STRING },
  },
  required: ["hook_score", "retention_score", "topic_score", "title_score", "ending_score", "comment_score", "conversion_score", "grade", "improvement_notes"],
};

const SYSTEM_INSTRUCTION = `あなたはYouTube Shortsのアナリストです。
再生数だけでなく、視聴維持率・登録者増加・エンゲージメントを総合的に評価してください。
「再生数は多いが登録者が増えない動画」と「再生数は普通だが登録者が大量に増える動画」を区別し、
後者をより高く評価してください。評価は S(大成功)/A(成功)/B(平均)/C(弱い)/D(失敗) の5段階。`;

export async function measureAndEvaluate(
  video: Video,
  script: Script,
  upload: Upload,
  windowLabel: "24h" | "48h" | "72h" | "7d"
) {
  if (!upload.youtubeVideoId) return null;

  try {
    const stats = (await getVideoStatistics([upload.youtubeVideoId]))[0];
    const publishedAt = upload.publishedAt ?? new Date();
    const startDate = publishedAt.toISOString().slice(0, 10);
    const endDate = new Date().toISOString().slice(0, 10);
    const metrics = await getVideoMetrics(upload.youtubeVideoId, startDate, endDate);

    const views = Number(stats?.statistics?.viewCount ?? metrics?.views ?? 0);
    const likes = Number(stats?.statistics?.likeCount ?? metrics?.likes ?? 0);
    const comments = Number(stats?.statistics?.commentCount ?? metrics?.comments ?? 0);

    const evalPrompt = `動画タイトル: ${script.title}
フック: ${script.hook}
オチ: ${script.ending}
経過期間: ${windowLabel}
再生数: ${views}
高評価数: ${likes}
コメント数: ${comments}
共有数: ${metrics?.shares ?? "不明"}
平均視聴時間(秒): ${metrics?.averageViewDuration ?? "不明"}
視聴維持率(%): ${metrics?.averageViewPercentage ?? "不明"}
登録者増加数: ${metrics?.subscribersGained ?? "不明"}`;

    const evaluation = await generateJson<{
      hook_score: number;
      retention_score: number;
      topic_score: number;
      title_score: number;
      ending_score: number;
      comment_score: number;
      conversion_score: number;
      grade: string;
      improvement_notes: string;
    }>(evalPrompt, EVAL_SCHEMA, { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.3 });

    const analytics = await prisma.analytics.create({
      data: {
        videoId: video.id,
        windowLabel,
        views: BigInt(views),
        likes: BigInt(likes),
        comments: BigInt(comments),
        shares: metrics?.shares ? BigInt(metrics.shares) : null,
        averageViewDuration: metrics?.averageViewDuration,
        averageViewPercentage: metrics?.averageViewPercentage,
        subscribersGained: metrics?.subscribersGained,
        hookScore: evaluation.hook_score,
        retentionScore: evaluation.retention_score,
        topicScore: evaluation.topic_score,
        titleScore: evaluation.title_score,
        endingScore: evaluation.ending_score,
        commentScore: evaluation.comment_score,
        conversionScore: evaluation.conversion_score,
        grade: evaluation.grade,
        aiEvaluationJson: JSON.stringify(evaluation),
        improvementNotes: evaluation.improvement_notes,
      },
    });

    return analytics;
  } catch (err) {
    await logError("AnalyticsAgent", err, { videoId: video.id, windowLabel });
    return null;
  }
}
