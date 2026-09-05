// BGM選定・ナレーションとのミックス(仕様書 21節)
// storage/assets/bgm/ に著作権上安全なBGM(mp3等)を配置すればランダムに選択される。
// 何も配置されていない場合は、ffmpegのsine波で著作権フリーの簡易アンビエントBGMを
// その場で合成するフォールバックを使う(無音になることを防ぐ)。

import fs from "fs";
import path from "path";
import { runFfmpeg } from "./ffmpeg";

const BGM_DIR = path.join(process.cwd(), "storage", "assets", "bgm");

export function pickBgmFile(): string | null {
  if (!fs.existsSync(BGM_DIR)) return null;
  const files = fs.readdirSync(BGM_DIR).filter((f) => /\.(mp3|wav|m4a)$/i.test(f));
  if (files.length === 0) return null;
  const chosen = files[Math.floor(Math.random() * files.length)];
  return path.join(BGM_DIR, chosen);
}

async function synthesizeAmbientBgm(durationSec: number, outputPath: string): Promise<string> {
  // 単純な和音(C-E-G)を低音量のアンビエントとして生成。ナレーションの邪魔をしないレベル。
  await runFfmpeg([
    "-f", "lavfi",
    "-i", `sine=frequency=130.81:duration=${durationSec}`,
    "-f", "lavfi",
    "-i", `sine=frequency=164.81:duration=${durationSec}`,
    "-f", "lavfi",
    "-i", `sine=frequency=196.00:duration=${durationSec}`,
    "-filter_complex", "[0][1][2]amix=inputs=3:duration=longest,volume=0.06",
    outputPath,
  ]);
  return outputPath;
}

export interface MixAudioResult {
  filePath: string;
}

/** ナレーション音声とBGMをミックスする。BGMはナレーションを邪魔しない音量にする。 */
export async function mixNarrationWithBgm(
  narrationPath: string,
  durationSec: number,
  outputDir: string
): Promise<MixAudioResult> {
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "mixed_audio.m4a");

  let bgmPath = pickBgmFile();
  if (!bgmPath) {
    bgmPath = await synthesizeAmbientBgm(durationSec, path.join(outputDir, "ambient_bgm.m4a"));
  }

  await runFfmpeg([
    "-i", narrationPath,
    "-stream_loop", "-1",
    "-i", bgmPath,
    "-filter_complex",
    `[1:a]volume=0.12,atrim=0:${durationSec}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=0[aout]`,
    "-map", "[aout]",
    "-c:a", "aac",
    "-b:a", "192k",
    outputPath,
  ]);

  return { filePath: outputPath };
}
