// 字幕描画(仕様書 20節)
// スマホで読める・大きい・短文・重要単語強調・音声と同期・YouTube UIと被らない

import fs from "fs";
import path from "path";
import { runFfmpeg } from "./ffmpeg";
import { resolveJapaneseFont } from "./fonts";
import type { SubtitleCue } from "./voice-provider";

/**
 * ffmpeg drawtextの`text=`パラメータはfiltergraph文字列内の実際の改行を扱えない
 * (パースエラーになる/複数行にならない)ため、各cueごとに一時テキストファイルを書き出し
 * `textfile=`で参照する。これにより複数行の字幕が画面幅に収まるよう折り返される。
 */
function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

/** 日本語字幕を読みやすい幅で改行する(1行あたり最大文字数) */
function wrapJapanese(text: string, maxCharsPerLine = 13): string {
  const chars = [...text];
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += maxCharsPerLine) {
    lines.push(chars.slice(i, i + maxCharsPerLine).join(""));
  }
  return lines.join("\n");
}

export async function burnSubtitles(
  inputVideoPath: string,
  cues: SubtitleCue[],
  outputDir: string
): Promise<string> {
  const font = escapeFilterPath(resolveJapaneseFont());
  const outputPath = path.join(outputDir, "subtitled.mp4");
  const subtitleFilesDir = path.join(outputDir, "subtitle_texts");
  fs.mkdirSync(subtitleFilesDir, { recursive: true });

  // YouTube Shortsの右側アイコン・下部タイトルと被らないよう、中央やや下(画面高さの68%付近)に配置
  const yExpr = "h*0.68-text_h/2";

  const filters = cues.map((cue, i) => {
    const wrapped = wrapJapanese(cue.text);
    const textFilePath = path.join(subtitleFilesDir, `cue_${i}.txt`);
    fs.writeFileSync(textFilePath, wrapped, "utf8");
    const escapedTextFilePath = escapeFilterPath(textFilePath);

    const fontsize = cue.emphasis ? 62 : 54;
    const fontcolor = cue.emphasis ? "yellow" : "white";
    return (
      `drawtext=fontfile='${font}':textfile='${escapedTextFilePath}':expansion=none:fontcolor=${fontcolor}:fontsize=${fontsize}:` +
      `x=(w-text_w)/2:y=${yExpr}:borderw=6:bordercolor=black@0.9:line_spacing=10:` +
      `enable='between(t,${cue.start},${cue.end})'`
    );
  });

  if (filters.length === 0) {
    // 字幕が無い場合はそのままコピー
    await runFfmpeg(["-i", inputVideoPath, "-c", "copy", outputPath]);
    return outputPath;
  }

  await runFfmpeg([
    "-i", inputVideoPath,
    "-vf", filters.join(","),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-an",
    outputPath,
  ]);

  return outputPath;
}
