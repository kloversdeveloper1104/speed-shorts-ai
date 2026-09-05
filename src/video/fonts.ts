import fs from "fs";
import path from "path";

// リポジトリに同梱したNoto Sans JP(Windows/Linux両対応)を最優先で使い、
// ローカル環境依存を無くす。無ければWindows標準フォントにフォールバックする。
const CANDIDATE_FONTS = [
  path.join(process.cwd(), "assets", "fonts", "NotoSansJP-Variable.ttf"),
  "C:/Windows/Fonts/meiryob.ttc", // Meiryo Bold
  "C:/Windows/Fonts/meiryo.ttc",
  "C:/Windows/Fonts/YuGothB.ttc", // Yu Gothic Bold
  "C:/Windows/Fonts/msgothic.ttc",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
  "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
];

export function resolveJapaneseFont(): string {
  for (const p of CANDIDATE_FONTS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    "日本語フォントが見つかりません。assets/fonts/NotoSansJP-Variable.ttf が存在するか確認してください。"
  );
}

/** ffmpegのdrawtextフィルタ用にパスをエスケープする */
export function escapeForFfmpegPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\\\:");
}
