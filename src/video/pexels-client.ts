// Pexels API クライアント(無料のフリー素材写真検索・ダウンロード)
// https://www.pexels.com/api/ — 無料APIキーのみで利用可能。商用利用可・著作権表記不要。
// PEXELS_API_KEY が未設定の場合は常にnullを返し、呼び出し側でモーショングラフィックスに
// フォールバックする設計。

import fs from "fs";
import path from "path";
import { env } from "@/utils/env";

interface PexelsPhoto {
  id: number;
  src: {
    large2x: string;
    large: string;
    portrait: string;
  };
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
}

interface PexelsVideoFile {
  link: string;
  width: number;
  height: number;
  quality: string; // "hd" | "sd" | "hls"
  file_type: string;
}

interface PexelsVideo {
  id: number;
  duration: number;
  video_files: PexelsVideoFile[];
}

interface PexelsVideoSearchResponse {
  videos: PexelsVideo[];
}

export function isPexelsConfigured(): boolean {
  return !!env("PEXELS_API_KEY");
}

/** シーン内容に合う縦長向きの写真を検索し、ローカルにダウンロードする */
export async function fetchStockPhoto(query: string, outputPath: string): Promise<string | null> {
  const apiKey = env("PEXELS_API_KEY");
  if (!apiKey) return null;

  try {
    const searchUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(15000),
    });
    if (!searchRes.ok) return null;

    const data = (await searchRes.json()) as PexelsSearchResponse;
    const photo = data.photos?.[0];
    if (!photo) return null;

    const imageUrl = photo.src.portrait || photo.src.large2x || photo.src.large;
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
    if (!imgRes.ok) return null;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  } catch {
    return null; // 検索失敗時は静かにnullを返し、呼び出し側でフォールバックさせる
  }
}

/** シーン内容に合う縦長向きの動画クリップを検索し、ローカルにダウンロードする(見つからなければnull) */
export async function fetchStockVideo(query: string, outputPath: string): Promise<string | null> {
  const apiKey = env("PEXELS_API_KEY");
  if (!apiKey) return null;

  try {
    const searchUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(15000),
    });
    if (!searchRes.ok) return null;

    const data = (await searchRes.json()) as PexelsVideoSearchResponse;
    const video = data.videos?.[0];
    if (!video) return null;

    // 縦動画(height > width)のmp4のうち、なるべく1080x1920に近い解像度を選ぶ
    const portraitFiles = video.video_files.filter(
      (f) => f.file_type === "video/mp4" && f.height > f.width
    );
    const candidates = portraitFiles.length > 0 ? portraitFiles : video.video_files.filter((f) => f.file_type === "video/mp4");
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => Math.abs(a.width - 1080) - Math.abs(b.width - 1080));
    const file = candidates[0];

    const videoRes = await fetch(file.link, { signal: AbortSignal.timeout(30000) });
    if (!videoRes.ok) return null;

    const buffer = Buffer.from(await videoRes.arrayBuffer());
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  } catch {
    return null;
  }
}
