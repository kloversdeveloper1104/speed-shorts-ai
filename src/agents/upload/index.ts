// UploadAgent: YouTubeへアップロードする(仕様書 24節)

import { uploadVideo } from "@/youtube/client";
import { prisma } from "@/database/client";
import { logError } from "@/utils/logger";
import { notify } from "@/utils/notification";
import type { Video, Script } from "@prisma/client";

export interface UploadParams {
  privacyStatus: "private" | "unlisted" | "public";
  scheduledAt?: Date;
}

export async function uploadVideoToYoutube(
  video: Video,
  script: Script,
  params: UploadParams
): Promise<{ success: boolean; youtubeVideoId?: string; error?: string }> {
  if (!video.filePath) {
    return { success: false, error: "動画ファイルがありません" };
  }

  const hashtags: string[] = script.hashtags ? JSON.parse(script.hashtags) : [];
  const keywords: string[] = script.keywords ? JSON.parse(script.keywords) : [];
  const description = `${script.description ?? ""}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`.trim();

  const upload = await prisma.upload.create({
    data: {
      videoId: video.id,
      title: script.title,
      description,
      tags: JSON.stringify(keywords),
      privacyStatus: params.privacyStatus,
      scheduledAt: params.scheduledAt,
      status: "UPLOADING",
    },
  });

  try {
    const result = await uploadVideo({
      filePath: video.filePath,
      title: script.title,
      description,
      tags: keywords,
      privacyStatus: params.privacyStatus,
      publishAt: params.scheduledAt?.toISOString(),
    });

    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        youtubeVideoId: result.id ?? undefined,
        status: "UPLOADED",
        publishedAt: new Date(),
      },
    });

    await prisma.video.update({ where: { id: video.id }, data: { status: "UPLOADED" } });

    await notify({
      title: "動画投稿完了",
      message: `「${script.title}」をYouTubeへ投稿しました (${params.privacyStatus})`,
      level: "success",
    });

    return { success: true, youtubeVideoId: result.id ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logError("UploadAgent", err, { videoId: video.id });

    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED", errorMessage: message },
    });
    await prisma.video.update({ where: { id: video.id }, data: { status: "FAILED" } });

    await notify({
      title: "動画投稿失敗",
      message: `「${script.title}」の投稿に失敗しました: ${message}`,
      level: "error",
    });

    return { success: false, error: message };
  }
}
