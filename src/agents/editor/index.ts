// EditorAgent: 台本・音声・映像素材からFFmpegで最終動画を組み立てる(仕様書 22節)

import fs from "fs";
import path from "path";
import { prisma } from "@/database/client";
import { logError } from "@/utils/logger";
import { getVoiceProvider } from "@/video/voice-provider";
import { renderSceneClip, concatClips } from "@/video/scene-renderer";
import { fetchStockPhoto, fetchStockVideo } from "@/video/pexels-client";
import { burnSubtitles } from "@/video/subtitles";
import { mixNarrationWithBgm } from "@/video/bgm";
import { runFfmpeg, probeMedia } from "@/video/ffmpeg";
import { generateThumbnail } from "@/video/thumbnail";
import { getFullNarration } from "@/agents/script";
import type { Script, Scene } from "@prisma/client";

const MAX_DURATION_SEC = 60;

export interface EditResult {
  videoId: string;
  filePath: string;
  durationSec: number;
}

export async function editVideoFromScript(script: Script & { scenes: Scene[] }): Promise<EditResult | null> {
  const workDir = path.join(process.cwd(), "storage", "drafts", script.id);
  fs.mkdirSync(workDir, { recursive: true });

  try {
    // 1. ナレーション音声を合成
    const fullNarration = getFullNarration(script.scenes);
    const voiceProvider = getVoiceProvider();
    const narrationPath = path.join(workDir, "narration.mp3");
    const synth = await voiceProvider.synthesize(fullNarration, narrationPath);

    // リトライ時に同じscriptIdで再実行されてもユニーク制約に落ちないようupsertする
    const video = await prisma.video.upsert({
      where: { scriptId: script.id },
      create: {
        channelId: (await prisma.channel.findFirst())?.id ?? (await ensureDefaultChannel()).id,
        scriptId: script.id,
        status: "EDITING",
      },
      update: { status: "EDITING" },
    });

    await prisma.voice.create({
      data: {
        videoId: video.id,
        provider: voiceProvider.name,
        filePath: synth.filePath,
        durationSec: synth.durationSec,
        subtitlesJson: JSON.stringify(synth.subtitles),
        status: "DONE",
      },
    });

    // 2. 各シーンをナレーション尺に合わせて比例配分し、モーショングラフィックスをレンダリング
    const totalNarrationChars = script.scenes.reduce((sum, s) => sum + (s.narration?.length ?? 1), 0);
    const clipsDir = path.join(workDir, "clips");
    const clipPaths: string[] = [];

    let idx = 0;
    for (const scene of script.scenes) {
      const weight = (scene.narration?.length ?? 1) / totalNarrationChars;
      const durationSec = Math.max(1.0, synth.durationSec * weight);

      let backgroundStyle = "gradient_blue";
      let keyword = "";
      let stockPhotoQuery = "";
      if (scene.visualPrompt) {
        try {
          const parsed = JSON.parse(scene.visualPrompt);
          backgroundStyle = parsed.background_style ?? backgroundStyle;
          keyword = parsed.keyword ?? "";
          stockPhotoQuery = parsed.stock_photo_query ?? "";
        } catch {
          // パース失敗時はデフォルトを使用
        }
      }

      // まず動画クリップを試し、無ければ写真、それも無ければグラデーションにフォールバック
      let videoPath: string | null = null;
      let photoPath: string | null = null;
      if (stockPhotoQuery) {
        videoPath = await fetchStockVideo(stockPhotoQuery, path.join(clipsDir, `video_${idx}.mp4`));
        if (!videoPath) {
          photoPath = await fetchStockPhoto(stockPhotoQuery, path.join(clipsDir, `photo_${idx}.jpg`));
        }
      }

      const clipPath = await renderSceneClip({
        index: idx,
        durationSec,
        backgroundStyle,
        keyword,
        outputDir: clipsDir,
        videoPath,
        photoPath,
      });
      clipPaths.push(clipPath);
      idx++;
    }

    // 3. シーンを連結
    const silentVideoPath = path.join(workDir, "silent.mp4");
    await concatClips(clipPaths, silentVideoPath);

    // 4. 字幕を焼き込み(実際のTTSタイミングに同期)
    const subtitledPath = await burnSubtitles(silentVideoPath, synth.subtitles, workDir);

    // 5. ナレーション + BGM をミックス
    const mixed = await mixNarrationWithBgm(synth.filePath, synth.durationSec, workDir);

    // 6. 映像 + 音声を結合、60秒上限を強制
    const completedDir = path.join(process.cwd(), "storage", "completed");
    fs.mkdirSync(completedDir, { recursive: true });
    const finalPath = path.join(completedDir, `${video.id}.mp4`);

    await runFfmpeg([
      "-i", subtitledPath,
      "-i", mixed.filePath,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-t", String(MAX_DURATION_SEC),
      "-c:v", "libx264",
      "-profile:v", "high",
      "-pix_fmt", "yuv420p",
      "-r", "30",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      "-shortest",
      finalPath,
    ]);

    const probe = await probeMedia(finalPath);

    // サムネイル生成(検索・関連動画欄でのCTR向上のため)。
    // 字幕焼き込み前(silentVideoPath)のフレームを使うことで、既存の字幕テキストと
    // サムネイル文言が二重に表示されるのを防ぐ。失敗しても動画生成自体は続行する。
    let thumbnailPath: string | null = null;
    try {
      thumbnailPath = await generateThumbnail(silentVideoPath, script.hook, workDir);
    } catch (err) {
      await logError("EditorAgent:Thumbnail", err, { scriptId: script.id });
    }

    await prisma.video.update({
      where: { id: video.id },
      data: {
        filePath: finalPath,
        thumbnailPath,
        durationSec: probe.durationSec,
        width: probe.width ?? 1080,
        height: probe.height ?? 1920,
        status: "REVIEW",
      },
    });

    return { videoId: video.id, filePath: finalPath, durationSec: probe.durationSec };
  } catch (err) {
    await logError("EditorAgent", err, { scriptId: script.id });
    return null;
  }
}

async function ensureDefaultChannel() {
  return prisma.channel.create({
    data: { googleAccountEmail: "kloversmovie@gmail.com" },
  });
}
