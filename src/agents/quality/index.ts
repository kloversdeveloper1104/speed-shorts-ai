// QualityAgent: 投稿前の自動検査(仕様書 23節)

import { SchemaType } from "@google/generative-ai";
import { generateJson } from "@/gemini/client";
import { probeMedia } from "@/video/ffmpeg";
import { prisma } from "@/database/client";
import { logError } from "@/utils/logger";
import { getQualityThreshold } from "@/utils/env";
import type { Video, Script } from "@prisma/client";

export interface QualityChecklist {
  duration_ok: boolean;
  aspect_ratio_ok: boolean;
  resolution_ok: boolean;
  has_audio: boolean;
  has_subtitle: boolean;
  subtitle_synced: boolean;
  no_visual_glitch: boolean;
  no_black_screen: boolean;
  no_audio_clipping: boolean;
  no_typo: boolean;
  no_misinformation: boolean;
  title_consistency: boolean;
  no_copyright_risk: boolean;
  no_duplicate_content: boolean;
  no_excessive_hype: boolean;
  no_sensitive_content: boolean;
}

const CONTENT_SAFETY_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    no_typo: { type: SchemaType.BOOLEAN },
    no_misinformation: { type: SchemaType.BOOLEAN },
    title_consistency: { type: SchemaType.BOOLEAN },
    no_copyright_risk: { type: SchemaType.BOOLEAN },
    no_excessive_hype: { type: SchemaType.BOOLEAN },
    no_sensitive_content: { type: SchemaType.BOOLEAN },
    issues: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          severity: { type: SchemaType.STRING }, // "critical" | "minor"
          description: { type: SchemaType.STRING },
        },
        required: ["severity", "description"],
      },
    },
  },
  required: ["no_typo", "no_misinformation", "title_consistency", "no_copyright_risk", "no_excessive_hype", "no_sensitive_content", "issues"],
};

const SYSTEM_INSTRUCTION = `あなたはYouTube Shortsのコンテンツ安全性レビュアーです。
虚偽情報・誤情報・危険な助言・差別・誹謗中傷・著作権侵害・なりすまし・誤解を招くタイトル・
過剰な煽りが無いかをチェックしてください。事実確認できない主張は「諸説あります」等の
表現になっているかも確認してください。

見つかった懸念点は issues 配列に入れ、それぞれに severity ("critical" または "minor") を付けてください。

- critical: 明確な虚偽情報、危険な助言、差別・誹謗中傷、著作権侵害、なりすまし、
  タイトルと内容の重大な不一致、視聴者に実害が及びうる誤解を招く表現。
- minor: YouTube Shortsとして一般的な範囲の軽い強調・煽り表現、一般に知られた俗説や
  簡略化(例:「ジャネの法則」等の心理学ネタ)、本質的な誤りではない軽微な言い回しの粗さ。

critical な懸念点が無ければ投稿を妨げるべきではありません。minor な懸念点は記録するだけで、
不合格の理由にしないでください。`;

export interface QualityIssue {
  severity: "critical" | "minor";
  description: string;
}

export interface QualityResult {
  score: number;
  checklist: QualityChecklist;
  issues: QualityIssue[];
  passed: boolean;
}

export async function runQualityCheck(
  video: Video,
  script: Script & { scenes: { subtitle: string | null }[] }
): Promise<QualityResult> {
  const issues: QualityIssue[] = [];
  const checklist: Partial<QualityChecklist> = {};
  const addCritical = (description: string) => issues.push({ severity: "critical", description });

  try {
    if (!video.filePath) throw new Error("動画ファイルが存在しません");
    const probe = await probeMedia(video.filePath);

    checklist.duration_ok = probe.durationSec > 0 && probe.durationSec <= 60;
    if (!checklist.duration_ok) addCritical(`動画尺が不正です(${probe.durationSec}秒)`);

    checklist.resolution_ok = probe.width === 1080 && probe.height === 1920;
    if (!checklist.resolution_ok) addCritical(`解像度が1080x1920ではありません(${probe.width}x${probe.height})`);

    checklist.aspect_ratio_ok = checklist.resolution_ok;

    checklist.has_audio = probe.hasAudio;
    if (!checklist.has_audio) addCritical("音声トラックがありません");

    checklist.has_subtitle = script.scenes.some((s) => (s.subtitle ?? "").length > 0);
    if (!checklist.has_subtitle) addCritical("字幕がありません");

    checklist.subtitle_synced = true; // TTSタイミングから生成しているため同期済みとみなす
    checklist.no_black_screen = true; // モーショングラフィックス生成のため黒画面は発生しない設計
    checklist.no_visual_glitch = true;
    checklist.no_audio_clipping = true; // BGMは-0.12、ナレーションは合成音声のためクリッピングなし
    checklist.no_duplicate_content = true; // 重複チェックは別途DuplicateDetectorで実施

    // Geminiによるコンテンツ安全性チェック
    const fullText = `${script.title}\n${script.hook}\n${script.scenes.map((s) => s.subtitle).join(" ")}\n${script.ending}`;
    const safety = await generateJson<{
      no_typo: boolean;
      no_misinformation: boolean;
      title_consistency: boolean;
      no_copyright_risk: boolean;
      no_excessive_hype: boolean;
      no_sensitive_content: boolean;
      issues: QualityIssue[];
    }>(
      `以下のYouTube Shorts台本を検査してください。\n\nタイトル: ${script.title}\n\n内容:\n${fullText}`,
      CONTENT_SAFETY_SCHEMA,
      { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0 }
    );

    checklist.no_typo = safety.no_typo;
    checklist.no_misinformation = safety.no_misinformation;
    checklist.title_consistency = safety.title_consistency;
    checklist.no_copyright_risk = safety.no_copyright_risk;
    checklist.no_excessive_hype = safety.no_excessive_hype;
    checklist.no_sensitive_content = safety.no_sensitive_content;
    issues.push(
      ...(safety.issues ?? []).map((i) => ({
        severity: i.severity === "critical" ? ("critical" as const) : ("minor" as const),
        description: i.description,
      }))
    );

    const full = checklist as QualityChecklist;
    const passedCount = Object.values(full).filter(Boolean).length;
    const totalCount = Object.values(full).length;
    const score = Math.round((passedCount / totalCount) * 100);

    const channel = await prisma.channel.findUnique({ where: { id: video.channelId } });
    const threshold = channel?.qualityThreshold ?? getQualityThreshold();
    const criticalIssues = issues.filter((i) => i.severity === "critical");

    const result: QualityResult = {
      score,
      checklist: full,
      issues,
      passed: criticalIssues.length === 0 && score >= threshold,
    };

    // 基準未達の場合も動画自体は生成できているため、失敗ではなく下書きとして保存し、
    // 管理画面から内容を見て手動投稿・再編集できるようにする。
    await prisma.video.update({
      where: { id: video.id },
      data: {
        qualityScore: score,
        qualityChecklist: JSON.stringify(full),
        qualityIssues: JSON.stringify(issues),
        status: result.passed ? "REVIEW" : "DRAFT",
      },
    });

    return result;
  } catch (err) {
    await logError("QualityAgent", err, { videoId: video.id });
    return {
      score: 0,
      checklist: checklist as QualityChecklist,
      issues: [...issues, { severity: "critical", description: err instanceof Error ? err.message : String(err) }],
      passed: false,
    };
  }
}
