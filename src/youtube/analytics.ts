// YouTube Analytics API ラッパー(仕様書 29節)

import { google } from "googleapis";
import { getAuthenticatedClient } from "./oauth";

function getAnalyticsClient() {
  const auth = getAuthenticatedClient();
  if (!auth) {
    throw new Error("YouTube未認証です。");
  }
  return google.youtubeAnalytics({ version: "v2", auth });
}

export interface VideoMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  averageViewDuration: number;
  averageViewPercentage: number;
  subscribersGained: number;
}

export async function getVideoMetrics(
  youtubeVideoId: string,
  startDate: string,
  endDate: string
): Promise<VideoMetrics | null> {
  const analytics = getAnalyticsClient();
  try {
    const res = await analytics.reports.query({
      ids: "channel==MINE",
      startDate,
      endDate,
      metrics: "views,likes,comments,shares,averageViewDuration,averageViewPercentage,subscribersGained",
      filters: `video==${youtubeVideoId}`,
    });

    const row = res.data.rows?.[0];
    if (!row) return null;

    const [views, likes, comments, shares, averageViewDuration, averageViewPercentage, subscribersGained] = row;
    return {
      views: Number(views ?? 0),
      likes: Number(likes ?? 0),
      comments: Number(comments ?? 0),
      shares: Number(shares ?? 0),
      averageViewDuration: Number(averageViewDuration ?? 0),
      averageViewPercentage: Number(averageViewPercentage ?? 0),
      subscribersGained: Number(subscribersGained ?? 0),
    };
  } catch {
    return null; // 集計反映までタイムラグがあるため取得できない場合はnullを返す
  }
}
