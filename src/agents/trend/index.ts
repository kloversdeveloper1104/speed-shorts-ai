// TrendAgent: YouTube Shorts市場のトレンドを調査する

import { prisma } from "@/database/client";
import {
  searchShorts,
  getVideoStatistics,
  getChannelStatistics,
  getTrendingVideos,
} from "@/youtube/client";
import { computeBuzzScore } from "../viral/buzz-score";
import { logError } from "@/utils/logger";
import type { youtube_v3 } from "googleapis";

const DEFAULT_KEYWORDS = [
  "スピード 最速 shorts",
  "最高速 ランキング shorts",
  "モータースポーツ shorts",
  "動物 速い shorts",
  "スピード記録 shorts",
  "レース 迫力 shorts",
  "速さ 比較 shorts",
  "限界突破 スピード shorts",
];

export interface CollectTrendsResult {
  trendId: string;
  collected: number;
}

/** 動画統計リストをSourceVideoとしてDBへ保存する(キーワード検索・急上昇チャート共通処理) */
async function saveSourceVideos(trendId: string, stats: youtube_v3.Schema$Video[]): Promise<number> {
  const channelIds = [...new Set(stats.map((v) => v.snippet?.channelId).filter((c): c is string => !!c))];
  const channelStats = await getChannelStatistics(channelIds);
  const subsByChannel = new Map(channelStats.map((c) => [c.id, Number(c.statistics?.subscriberCount ?? 0)]));

  let collected = 0;
  for (const v of stats) {
    if (!v.id || !v.snippet) continue;
    const subscriberCount = subsByChannel.get(v.snippet.channelId ?? "") ?? 0;
    const buzzScore = computeBuzzScore({
      viewCount: Number(v.statistics?.viewCount ?? 0),
      likeCount: Number(v.statistics?.likeCount ?? 0),
      commentCount: Number(v.statistics?.commentCount ?? 0),
      subscriberCount,
      publishedAt: v.snippet.publishedAt ? new Date(v.snippet.publishedAt) : new Date(),
    });

    await prisma.sourceVideo.upsert({
      where: { youtubeVideoId: v.id },
      create: {
        trendId,
        youtubeVideoId: v.id,
        title: v.snippet.title ?? "",
        channelTitle: v.snippet.channelTitle,
        channelId: v.snippet.channelId,
        publishedAt: v.snippet.publishedAt ? new Date(v.snippet.publishedAt) : null,
        viewCount: BigInt(v.statistics?.viewCount ?? 0),
        likeCount: BigInt(v.statistics?.likeCount ?? 0),
        commentCount: BigInt(v.statistics?.commentCount ?? 0),
        subscriberCount: BigInt(subscriberCount),
        durationSeconds: parseIsoDuration(v.contentDetails?.duration),
        url: `https://www.youtube.com/shorts/${v.id}`,
        buzzScore,
      },
      update: {
        viewCount: BigInt(v.statistics?.viewCount ?? 0),
        likeCount: BigInt(v.statistics?.likeCount ?? 0),
        commentCount: BigInt(v.statistics?.commentCount ?? 0),
        buzzScore,
        // 再検出時にfetchedAtを更新しないと、繰り返し検出される人気動画ほど
        // getRecentTrendingTopics()の「直近48時間」フィルタから漏れてしまう
        fetchedAt: new Date(),
      },
    });
    collected++;
  }
  return collected;
}

export async function collectTrends(keywords: string[] = DEFAULT_KEYWORDS): Promise<CollectTrendsResult[]> {
  const results: CollectTrendsResult[] = [];

  for (const keyword of keywords) {
    try {
      const searchItems = await searchShorts(keyword, 25);
      const videoIds = searchItems.map((i) => i.id?.videoId).filter((id): id is string => !!id);
      if (videoIds.length === 0) continue;

      const stats = await getVideoStatistics(videoIds);
      const trend = await prisma.trend.create({
        data: { keyword, category: null, score: 0, source: "youtube" },
      });

      const collected = await saveSourceVideos(trend.id, stats);

      await prisma.trend.update({
        where: { id: trend.id },
        data: { score: collected > 0 ? collected : 0 },
      });

      results.push({ trendId: trend.id, collected });
    } catch (err) {
      await logError("TrendAgent", err, { keyword });
    }
  }

  return results;
}

/**
 * YouTube公式の急上昇チャート(日本)を取り込む。
 * 固定キーワード検索とは異なり、実際に「今伸びている」動画をジャンル横断で捉えられる。
 * Shorts的な尺(60秒以内)の動画を優先的に抽出する。
 */
export async function collectTrendingChart(): Promise<CollectTrendsResult | null> {
  try {
    const items = await getTrendingVideos("JP", 50);
    const shortsLike = items.filter((v) => {
      const sec = parseIsoDuration(v.contentDetails?.duration);
      return sec != null && sec > 0 && sec <= 180; // Shorts本編+関連の尺で緩めに抽出
    });
    const targets = shortsLike.length > 0 ? shortsLike : items;

    const trend = await prisma.trend.create({
      data: { keyword: "急上昇(YouTube公式・日本)", category: null, score: 0, source: "youtube_trending" },
    });

    const collected = await saveSourceVideos(trend.id, targets);

    await prisma.trend.update({
      where: { id: trend.id },
      data: { score: collected },
    });

    return { trendId: trend.id, collected };
  } catch (err) {
    await logError("TrendAgent:collectTrendingChart", err);
    return null;
  }
}

function parseIsoDuration(iso?: string | null): number | null {
  if (!iso) return null;
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!match) return null;
  const [, h, m, s] = match;
  return (Number(h ?? 0) * 3600) + (Number(m ?? 0) * 60) + Number(s ?? 0);
}

/** 「小規模チャンネルなのに異常に再生されている」動画を優先して取得する */
export async function getTopBuzzingSourceVideos(limit = 10) {
  return prisma.sourceVideo.findMany({
    orderBy: { buzzScore: "desc" },
    take: limit,
    include: { analysis: true },
  });
}

/** 直近収集した急上昇テーマ(タイトル)をIdeaAgentのプロンプトに直接渡すために取得する */
export async function getRecentTrendingTopics(limit = 15) {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000); // 直近48時間分
  return prisma.sourceVideo.findMany({
    where: { fetchedAt: { gte: since } },
    orderBy: { buzzScore: "desc" },
    take: limit,
    select: { title: true, buzzScore: true, channelTitle: true },
  });
}
