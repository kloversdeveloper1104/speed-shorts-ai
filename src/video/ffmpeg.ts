// FFmpeg実行ラッパー。子プロセスとして起動し、引数は配列で渡すことで
// Windowsパスのスペースやクォート問題を回避する。

import { spawn } from "child_process";

export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], {
      windowsHide: true,
    });

    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    proc.on("error", (err) => {
      reject(new Error(`FFmpegの起動に失敗しました: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpegがコード${code}で終了しました:\n${stderr.slice(-2000)}`));
    });
  });
}

export function runFfprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err) => reject(new Error(`FFprobeの起動に失敗しました: ${err.message}`)));
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`FFprobeがコード${code}で終了しました:\n${stderr.slice(-1000)}`));
    });
  });
}

export interface ProbeResult {
  durationSec: number;
  width?: number;
  height?: number;
  hasAudio: boolean;
  hasVideo: boolean;
}

export async function probeMedia(filePath: string): Promise<ProbeResult> {
  const out = await runFfprobe([
    "-v", "error",
    "-show_entries", "format=duration:stream=width,height,codec_type",
    "-of", "json",
    filePath,
  ]);
  const data = JSON.parse(out);
  const streams: Array<{ codec_type: string; width?: number; height?: number }> = data.streams ?? [];
  const videoStream = streams.find((s) => s.codec_type === "video");
  const hasAudio = streams.some((s) => s.codec_type === "audio");
  return {
    durationSec: Number(data.format?.duration ?? 0),
    width: videoStream?.width,
    height: videoStream?.height,
    hasAudio,
    hasVideo: !!videoStream,
  };
}
