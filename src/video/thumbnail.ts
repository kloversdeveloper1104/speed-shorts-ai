// サムネイル生成(仕様書には無いが、検索・関連動画欄でのCTR向上のため追加)
// 動画の序盤のフレームを抜き出し、フック文言を大きく焼き込んだ静止画を作る。

import fs from "fs";
import path from "path";
import { runFfmpeg } from "./ffmpeg";
import { resolveJapaneseFont } from "./fonts";

function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

/** サムネイル用に短く改行する(最大3行まで) */
function wrapForThumbnail(text: string, maxCharsPerLine = 10): string {
  const chars = [...text];
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += maxCharsPerLine) {
    lines.push(chars.slice(i, i + maxCharsPerLine).join(""));
  }
  return lines.slice(0, 3).join("\n");
}

/**
 * 完成動画からフレームを1枚抜き出し、フック文言を焼き込んでサムネイル画像を生成する。
 * @param videoPath 完成した動画ファイル(字幕・BGM焼き込み後)
 * @param hookText サムネイルに表示するフック文言(script.hookを想定)
 */
export async function generateThumbnail(
  videoPath: string,
  hookText: string,
  outputDir: string
): Promise<string> {
  fs.mkdirSync(outputDir, { recursive: true });
  const font = escapeFilterPath(resolveJapaneseFont());
  const outputPath = path.join(outputDir, "thumbnail.jpg");
  const textFilePath = path.join(outputDir, "thumbnail_text.txt");
  fs.writeFileSync(textFilePath, wrapForThumbnail(hookText), "utf8");
  const escapedTextFilePath = escapeFilterPath(textFilePath);

  // 背景には元々シーンのキーワード演出テキストが焼き込まれている場合があるため、
  // どんな背景でも読めるよう半透明の帯(box)を敷いた上に文字を乗せる。
  await runFfmpeg([
    "-ss", "1.2",
    "-i", videoPath,
    "-vframes", "1",
    "-vf",
    `drawtext=fontfile='${font}':textfile='${escapedTextFilePath}':expansion=none:` +
      `fontcolor=white:fontsize=88:x=(w-text_w)/2:y=h*0.66-text_h/2:` +
      `box=1:boxcolor=black@0.6:boxborderw=24:borderw=6:bordercolor=black@0.9:line_spacing=14`,
    "-q:v", "2",
    outputPath,
  ]);

  return outputPath;
}
