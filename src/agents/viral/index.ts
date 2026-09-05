// ViralAnalyzer: 伸びている動画の「構造」だけを分析する。
// コピー禁止(仕様書 9, 47節) — フック・テーマ・テンポ・構成・視聴心理のみを抽出する。

import { SchemaType } from "@google/generative-ai";
import { generateJson } from "@/gemini/client";
import { prisma } from "@/database/client";
import { logError } from "@/utils/logger";
import type { SourceVideo } from "@prisma/client";

export interface ViralAnalysisJson {
  hook: string;
  topic: string;
  audience: string;
  duration: number;
  structure: string[];
  hook_type: string;
  narration_style: string;
  subtitle_style: string;
  scene_change_rate: number;
  emotion_curve: string;
  ending_type: string;
  comment_trigger: string;
  retention_strategy: string;
  why_it_works: string[];
  adaptation_ideas: string[];
  originality_risk: string;
}

const ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    hook: { type: SchemaType.STRING },
    topic: { type: SchemaType.STRING },
    audience: { type: SchemaType.STRING },
    duration: { type: SchemaType.NUMBER },
    structure: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    hook_type: { type: SchemaType.STRING },
    narration_style: { type: SchemaType.STRING },
    subtitle_style: { type: SchemaType.STRING },
    scene_change_rate: { type: SchemaType.NUMBER },
    emotion_curve: { type: SchemaType.STRING },
    ending_type: { type: SchemaType.STRING },
    comment_trigger: { type: SchemaType.STRING },
    retention_strategy: { type: SchemaType.STRING },
    why_it_works: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    adaptation_ideas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    originality_risk: { type: SchemaType.STRING },
  },
  required: [
    "hook", "topic", "audience", "duration", "structure", "hook_type",
    "narration_style", "subtitle_style", "scene_change_rate", "emotion_curve",
    "ending_type", "comment_trigger", "retention_strategy", "why_it_works",
    "adaptation_ideas", "originality_risk",
  ],
};

const SYSTEM_INSTRUCTION = `あなたはYouTube Shorts動画のバズ構造アナリストです。
重要なルール:
- 動画の台本・ナレーション・映像・字幕を「コピー」するための分析は絶対に行わない
- 分析するのは「なぜ伸びたか」という構造(フック・テンポ・構成・視聴者心理)のみ
- 出力は必ず日本語で、事実確認できない推測は含めない`;

export async function analyzeSourceVideo(sourceVideo: SourceVideo): Promise<ViralAnalysisJson | null> {
  try {
    const prompt = `以下のYouTube Shorts動画のメタデータから、動画の「構造」を分析してください。
実際の映像は見られないため、タイトル・再生数・エンゲージメント等から合理的に推測してください。
断定できない部分は「推測」であることが分かる表現にしてください。

タイトル: ${sourceVideo.title}
チャンネル: ${sourceVideo.channelTitle}
動画尺(秒): ${sourceVideo.durationSeconds}
再生数: ${sourceVideo.viewCount}
高評価数: ${sourceVideo.likeCount}
コメント数: ${sourceVideo.commentCount}
チャンネル登録者数: ${sourceVideo.subscriberCount}
Buzz Score: ${sourceVideo.buzzScore}

JSON形式で出力してください。`;

    const result = await generateJson<ViralAnalysisJson>(prompt, ANALYSIS_SCHEMA, {
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    await prisma.videoAnalysis.upsert({
      where: { sourceVideoId: sourceVideo.id },
      create: {
        sourceVideoId: sourceVideo.id,
        hook: result.hook,
        topic: result.topic,
        audience: result.audience,
        duration: result.duration,
        structure: JSON.stringify(result.structure),
        hookType: result.hook_type,
        narrationStyle: result.narration_style,
        subtitleStyle: result.subtitle_style,
        sceneChangeRate: result.scene_change_rate,
        emotionCurve: result.emotion_curve,
        endingType: result.ending_type,
        commentTrigger: result.comment_trigger,
        retentionStrategy: result.retention_strategy,
        whyItWorks: JSON.stringify(result.why_it_works),
        adaptationIdeas: JSON.stringify(result.adaptation_ideas),
        originalityRisk: result.originality_risk,
        rawJson: JSON.stringify(result),
      },
      update: {
        rawJson: JSON.stringify(result),
      },
    });

    return result;
  } catch (err) {
    await logError("ViralAnalyzer", err, { sourceVideoId: sourceVideo.id });
    return null;
  }
}

export async function analyzeUnanalyzedVideos(limit = 10) {
  const videos = await prisma.sourceVideo.findMany({
    where: { analysis: null },
    orderBy: { buzzScore: "desc" },
    take: limit,
  });

  const results = [];
  for (const v of videos) {
    const result = await analyzeSourceVideo(v);
    if (result) results.push({ sourceVideoId: v.id, result });
  }
  return results;
}
