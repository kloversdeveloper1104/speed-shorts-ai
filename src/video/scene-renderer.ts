// 各シーンをモーショングラフィックス動画としてレンダリングする。
// AI生成映像API(VIDEO_API_KEY)が無くても完成動画を作れるようにするフォールバック実装。
// グラデーション背景 + Ken Burns風ズーム + キーワードのテキストアニメーション。

import path from "path";
import fs from "fs";
import { runFfmpeg } from "./ffmpeg";
import { resolveJapaneseFont } from "./fonts";

const GRADIENT_PALETTES: Record<string, [string, string]> = {
  gradient_blue: ["0x1e3a8a", "0x9333ea"],
  gradient_orange: ["0xea580c", "0x7c2d12"],
  gradient_purple: ["0x581c87", "0xdb2777"],
  gradient_green: ["0x14532d", "0x0891b2"],
  dark_bold: ["0x111827", "0x1f2937"],
};

export interface SceneRenderInput {
  index: number;
  durationSec: number;
  backgroundStyle: string;
  keyword: string;
  outputDir: string;
  videoPath?: string | null; // Pexelsから取得したフリー素材動画(最優先)
  photoPath?: string | null; // Pexelsから取得したフリー素材写真(動画が無い場合)
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%");
}

export async function renderSceneClip(input: SceneRenderInput): Promise<string> {
  const font = resolveJapaneseFont().replace(/\\/g, "/").replace(/:/g, "\\:");
  const fps = 30;
  const durationSec = Math.max(0.5, input.durationSec);
  const frames = Math.max(1, Math.round(durationSec * fps));
  const outputPath = path.join(input.outputDir, `scene_${String(input.index).padStart(2, "0")}.mp4`);
  fs.mkdirSync(input.outputDir, { recursive: true });

  const keyword = escapeDrawtext(input.keyword || "");
  const keywordFilter = keyword
    ? `drawtext=fontfile='${font}':text='${keyword}':expansion=none:fontcolor=white:fontsize=100:x=(w-text_w)/2:y=(h-text_h)/2:borderw=8:bordercolor=black@0.85:box=1:boxcolor=black@0.35:boxborderw=24:alpha='if(lt(t,0.3),t/0.3,1)'`
    : null;

  if (input.videoPath) {
    // フリー素材動画クリップを使用(尺が足りなければループ、長ければトリム)
    const filterComplex = [
      "scale=1080:1920:force_original_aspect_ratio=increase",
      "crop=1080:1920",
      keywordFilter,
    ]
      .filter(Boolean)
      .join(",");

    await runFfmpeg([
      "-stream_loop", "-1",
      "-i", input.videoPath,
      "-vf", filterComplex,
      "-t", String(durationSec),
      "-r", String(fps),
      "-pix_fmt", "yuv420p",
      "-an",
      outputPath,
    ]);

    return outputPath;
  }

  if (input.photoPath) {
    // フリー素材写真をKen Burnsズームで動画化(9:16にcrop、著作権フリー素材のみ使用)
    const filterComplex = [
      "scale=1080:1920:force_original_aspect_ratio=increase",
      "crop=1080:1920",
      `zoompan=z='min(zoom+0.0015,1.2)':d=${frames}:s=1080x1920:fps=${fps}`,
      keywordFilter,
    ]
      .filter(Boolean)
      .join(",");

    await runFfmpeg([
      "-loop", "1",
      "-i", input.photoPath,
      "-vf", filterComplex,
      "-t", String(durationSec),
      "-r", String(fps),
      "-pix_fmt", "yuv420p",
      "-an",
      outputPath,
    ]);

    return outputPath;
  }

  // フォールバック: グラデーション背景のモーショングラフィックス
  const [c0, c1] = GRADIENT_PALETTES[input.backgroundStyle] ?? GRADIENT_PALETTES.gradient_blue;
  const filterComplex = [
    `gradients=s=1080x1920:d=${durationSec}:c0=${c0}:c1=${c1}:x0=0:y0=0:x1=1080:y1=1920:type=linear`,
    `zoompan=z='min(zoom+0.0012,1.15)':d=${frames}:s=1080x1920:fps=${fps}`,
    keywordFilter,
  ]
    .filter(Boolean)
    .join(",");

  await runFfmpeg([
    "-f", "lavfi",
    "-i", filterComplex,
    "-frames:v", String(frames),
    "-r", String(fps),
    "-pix_fmt", "yuv420p",
    "-an",
    outputPath,
  ]);

  return outputPath;
}

export async function concatClips(clipPaths: string[], outputPath: string): Promise<void> {
  const listPath = outputPath.replace(/\.mp4$/, "_concat_list.txt");
  const content = clipPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  fs.writeFileSync(listPath, content, "utf8");

  await runFfmpeg([
    "-f", "concat",
    "-safe", "0",
    "-i", listPath,
    "-c", "copy",
    outputPath,
  ]);

  fs.unlinkSync(listPath);
}
