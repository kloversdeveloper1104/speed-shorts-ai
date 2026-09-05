// YouTube Data API v3 / Analytics API のラッパー

import { google, youtube_v3 } from "googleapis";
import { getAuthenticatedClient } from "./oauth";

function getYoutube(): youtube_v3.Youtube {
  const auth = getAuthenticatedClient();
  if (!auth) {
    throw new Error("YouTube未認証です。管理画面のセットアップウィザードからGoogle OAuth認証を行ってください。");
  }
  return google.youtube({ version: "v3", auth });
}

export async function getMyChannel() {
  const yt = getYoutube();
  const res = await yt.channels.list({
    part: ["snippet", "statistics", "contentDetails"],
    mine: true,
  });
  return res.data.items?.[0] ?? null;
}

export interface UploadVideoParams {
  filePath: string;
  title: string;
  description: string;
  tags?: string[];
  privacyStatus: "private" | "unlisted" | "public";
  categoryId?: string;
  publishAt?: string; // ISO 8601 (予約投稿, privacyStatus=privateと併用)
}

export async function uploadVideo(params: UploadVideoParams) {
  const yt = getYoutube();
  const fs = await import("fs");

  const res = await yt.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: params.title,
        description: params.description,
        tags: params.tags,
        categoryId: params.categoryId ?? "22", // People & Blogs
      },
      status: {
        privacyStatus: params.privacyStatus,
        publishAt: params.publishAt,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(params.filePath),
    },
  });

  return res.data;
}

export async function searchShorts(query: string, maxResults = 25) {
  const yt = getYoutube();
  const res = await yt.search.list({
    part: ["snippet"],
    q: query,
    type: ["video"],
    videoDuration: "short",
    order: "viewCount",
    maxResults,
  });
  return res.data.items ?? [];
}

export async function getVideoStatistics(videoIds: string[]) {
  const yt = getYoutube();
  const res = await yt.videos.list({
    part: ["statistics", "snippet", "contentDetails"],
    id: videoIds,
  });
  return res.data.items ?? [];
}

export async function getChannelStatistics(channelIds: string[]) {
  const yt = getYoutube();
  const res = await yt.channels.list({
    part: ["statistics"],
    id: channelIds,
  });
  return res.data.items ?? [];
}

/** YouTube公式の急上昇チャート(日本)を取得する。キーワード検索より生の「今伸びている」動画を捉えられる。 */
export async function getTrendingVideos(regionCode = "JP", maxResults = 50) {
  const yt = getYoutube();
  const res = await yt.videos.list({
    part: ["snippet", "statistics", "contentDetails"],
    chart: "mostPopular",
    regionCode,
    maxResults,
  });
  return res.data.items ?? [];
}
