// StrategyAgent: 過去データから「チャンネル専用・勝ちパターンDB」を更新する(仕様書 31, 32節)

import { SchemaType } from "@google/generative-ai";
import { generateJson } from "@/gemini/client";
import { prisma } from "@/database/client";
import { logError } from "@/utils/logger";

const STRATEGY_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    winning_patterns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    losing_patterns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    best_topics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    best_hooks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    best_length: { type: SchemaType.STRING },
    best_post_time: { type: SchemaType.STRING },
    best_ending: { type: SchemaType.STRING },
    best_cta: { type: SchemaType.STRING },
  },
  required: ["winning_patterns", "losing_patterns", "best_topics", "best_hooks", "best_length", "best_post_time", "best_ending", "best_cta"],
};

const SYSTEM_INSTRUCTION = `あなたはYouTube Shortsチャンネルのグロース戦略アナリストです。
過去の投稿データから「このチャンネル固有の勝ちパターン」を発見してください。
データが少ない場合は、断定を避け「傾向として」等の表現を使ってください。`;

export async function updateStrategy(channelId: string) {
  try {
    const videos = await prisma.video.findMany({
      where: { channelId, status: "UPLOADED" },
      include: {
        script: true,
        upload: true,
        analytics: { orderBy: { measuredAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    if (videos.length === 0) {
      return null; // データが無ければ戦略更新をスキップ
    }

    const dataSummary = videos
      .map((v) => {
        const a = v.analytics[0];
        return `- タイトル:${v.script.title} / 尺:${v.durationSec}秒 / フック:${v.script.hook} / オチ:${v.script.ending} / 投稿時刻:${v.upload?.publishedAt} / grade:${a?.grade} / views:${a?.views} / retention:${a?.retentionScore}`;
      })
      .join("\n");

    const strategy = await generateJson<{
      winning_patterns: string[];
      losing_patterns: string[];
      best_topics: string[];
      best_hooks: string[];
      best_length: string;
      best_post_time: string;
      best_ending: string;
      best_cta: string;
    }>(
      `以下は過去の投稿動画データです。勝ちパターン・負けパターンを分析してください。\n\n${dataSummary}`,
      STRATEGY_SCHEMA,
      { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.4 }
    );

    const created = await prisma.strategy.create({
      data: {
        channelId,
        winningPatterns: JSON.stringify(strategy.winning_patterns),
        losingPatterns: JSON.stringify(strategy.losing_patterns),
        bestTopics: JSON.stringify(strategy.best_topics),
        bestHooks: JSON.stringify(strategy.best_hooks),
        bestLength: strategy.best_length,
        bestPostTime: strategy.best_post_time,
        bestEnding: strategy.best_ending,
        bestCta: strategy.best_cta,
        rawAnalysis: dataSummary,
      },
    });

    return created;
  } catch (err) {
    await logError("StrategyAgent", err, { channelId });
    return null;
  }
}
