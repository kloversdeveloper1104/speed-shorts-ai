// VoiceProvider抽象化。
// デフォルトは無料のMicrosoft Edge TTS(APIキー不要)。
// VOICE_PROVIDER を .env で切り替えれば、将来的に他プロバイダー(Google Cloud TTS等)へ
// コード変更なしで切り替えられる。

import fs from "fs";
import path from "path";
import { env } from "@/utils/env";
import { probeMedia } from "./ffmpeg";
import { synthesizeEdgeTtsToFile } from "./edge-tts-client";

export interface SubtitleCue {
  start: number; // 秒
  end: number;
  text: string;
  emphasis: boolean;
}

export interface SynthesizeResult {
  filePath: string;
  durationSec: number;
  subtitles: SubtitleCue[];
}

export interface VoiceProvider {
  name: string;
  synthesize(text: string, outputPath: string): Promise<SynthesizeResult>;
}

// ---------------- Edge TTS (無料・デフォルト) ----------------

class EdgeTtsProvider implements VoiceProvider {
  name = "edge-tts";
  private voice = "ja-JP-KeitaNeural"; // 実況風・自然な日本語男性ボイス

  async synthesize(text: string, outputPath: string): Promise<SynthesizeResult> {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const audioFilePath = await synthesizeEdgeTtsToFile(text, this.voice, outputPath);

    // 単語単位のタイミング情報は取得しないため、実際の音声尺(ffprobe)を
    // 文字数比率で按分して字幕タイミングを算出する。
    const probe = await probeMedia(audioFilePath);
    const durationSec = probe.durationSec > 0 ? probe.durationSec : estimateDurationFromText(text);
    const subtitles = buildSentenceCues(text, durationSec);

    return { filePath: audioFilePath, durationSec, subtitles };
  }
}

function buildSentenceCues(originalText: string, totalDuration: number): SubtitleCue[] {
  const sentences = originalText.split(/(?<=[。！？\n])/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) {
    return [{ start: 0, end: totalDuration, text: originalText, emphasis: false }];
  }

  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
  let cursor = 0;
  return sentences.map((sentence) => {
    const ratio = sentence.length / totalChars;
    const dur = totalDuration * ratio;
    const cue: SubtitleCue = {
      start: Number(cursor.toFixed(2)),
      end: Number((cursor + dur).toFixed(2)),
      text: sentence.trim(),
      emphasis: /[!?！？]|絶対|必ず|実は|知らないと/.test(sentence),
    };
    cursor += dur;
    return cue;
  });
}

function estimateDurationFromText(text: string): number {
  // 日本語の平均発話速度: 約6〜7文字/秒 と仮定
  return Math.max(1, text.replace(/\s/g, "").length / 6.5);
}

// ---------------- プロバイダー選択 ----------------

export function getVoiceProvider(): VoiceProvider {
  const providerName = env("VOICE_PROVIDER", "edge-tts");
  switch (providerName) {
    case "edge-tts":
    default:
      return new EdgeTtsProvider();
  }
}
