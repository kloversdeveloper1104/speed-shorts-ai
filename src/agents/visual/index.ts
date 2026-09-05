// VisualAgent: 各シーンの映像素材を設計する(仕様書 17, 18節)
//
// 無料のPexels API(フリー素材、商用利用可・著作権表記不要)でシーン内容に合う
// 実写/イラスト写真を検索し、Ken Burnsズームで動画化する。PEXELS_API_KEYが
// 未設定、または該当写真が見つからない場合はFFmpegのモーショングラフィックス
// (グラデーション背景 + テキストアニメーション)にフォールバックする。
// 第三者の動画・画像は一切使用しない(フリー素材のみ)(仕様書17節)。

import { SchemaType } from "@google/generative-ai";
import { generateJson } from "@/gemini/client";
import { prisma } from "@/database/client";
import { logError } from "@/utils/logger";
import type { Scene } from "@prisma/client";

interface VisualPromptResult {
  visual_prompt: string;
  background_style: "gradient_blue" | "gradient_orange" | "gradient_purple" | "gradient_green" | "dark_bold";
  keyword: string; // 画面に大きく出す1〜4文字のキーワード
  stock_photo_query: string; // フリー素材検索用の英語キーワード(2〜4語、具体的な名詞句)
}

const SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    visual_prompt: { type: SchemaType.STRING },
    background_style: { type: SchemaType.STRING },
    keyword: { type: SchemaType.STRING },
    stock_photo_query: { type: SchemaType.STRING },
  },
  required: ["visual_prompt", "background_style", "keyword", "stock_photo_query"],
};

const SYSTEM_INSTRUCTION = `あなたはYouTube Shorts(縦型9:16)の映像演出家です。
各シーンについて、以下を設計してください。
- visual_prompt: 映像内容を表す英語の説明文
- background_style: FFmpegで描画するグラデーション背景のスタイル(フリー素材が見つからない場合のフォールバック用)
- keyword: 画面に大きく強調表示する日本語キーワード(1〜4文字)
- stock_photo_query: 無料フリー素材サイト(Pexels)でこのシーンに合う写真・動画を検索するための、
  具体的で一般的な英語キーワード(2〜4語程度。例: "sports car racing", "cheetah running fast",
  "rocket launch speed", "motorcycle race track"など)。人物・物・場所など画になる具体名詞を使うこと。`;

export async function designSceneVisual(scene: Scene): Promise<VisualPromptResult | null> {
  try {
    const prompt = `シーン内容: ${scene.visual}
ナレーション: ${scene.narration}
字幕: ${scene.subtitle}
時間: ${scene.startSec}〜${scene.endSec}秒`;

    const result = await generateJson<VisualPromptResult>(prompt, SCHEMA, {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.8,
    });

    await prisma.scene.update({
      where: { id: scene.id },
      data: { visualPrompt: JSON.stringify(result) },
    });

    await prisma.asset.create({
      data: {
        sceneId: scene.id,
        type: "motion_graphic",
        provider: "ffmpeg",
        prompt: result.visual_prompt,
        status: "PENDING",
      },
    });

    return result;
  } catch (err) {
    await logError("VisualAgent", err, { sceneId: scene.id });
    return null;
  }
}

export async function designAllScenes(scenes: Scene[]) {
  const results = [];
  for (const scene of scenes) {
    const result = await designSceneVisual(scene);
    if (result) results.push({ sceneId: scene.id, result });
  }
  return results;
}
