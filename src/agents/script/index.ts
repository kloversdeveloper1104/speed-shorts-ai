// ScriptAgent: Shorts台本を生成する(仕様書 14, 15節)
// 最大60秒、基本尺35〜55秒。0-3秒で強烈なフック、3-50秒で結論先出し・テンポ重視、50-60秒でオチ。

import { SchemaType } from "@google/generative-ai";
import { generateJson } from "@/gemini/client";
import { prisma } from "@/database/client";
import { logError } from "@/utils/logger";
import type { Idea } from "@prisma/client";

interface RawScene {
  start: number;
  end: number;
  visual: string;
  narration: string;
  subtitle: string;
  sfx: string;
}

interface RawScript {
  title: string;
  duration: number;
  hook: string;
  scenes: RawScene[];
  ending: string;
  description: string;
  hashtags: string[];
  keywords: string[];
}

const SCRIPT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    duration: { type: SchemaType.NUMBER },
    hook: { type: SchemaType.STRING },
    scenes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          start: { type: SchemaType.NUMBER },
          end: { type: SchemaType.NUMBER },
          visual: { type: SchemaType.STRING },
          narration: { type: SchemaType.STRING },
          subtitle: { type: SchemaType.STRING },
          sfx: { type: SchemaType.STRING },
        },
        required: ["start", "end", "visual", "narration", "subtitle", "sfx"],
      },
    },
    ending: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    hashtags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["title", "duration", "hook", "scenes", "ending", "description", "hashtags", "keywords"],
};

const SYSTEM_INSTRUCTION = `あなたはYouTube Shortsチャンネル「スピードマックス」専属の実況風放送作家です。
テーマは「スピード・速さ」全般。
台本ルール:
- 動画尺は35〜55秒(最大60秒)
- ナレーションは「テンションの高い実況風」口調で書くこと。スポーツ実況や興奮したリアクションのような
  勢いのある言い回し(「うおおおお！」「まさかの○○！」「信じられるか！？」等)を要所で使い、
  スピード感・興奮が伝わる文体にする(ただし品位は保つ)
- 0〜3秒: 強烈なフック。「こんにちは」「今回は○○について紹介します」等の挨拶・前置きは絶対禁止
- 3〜50秒: 結論を先に出す。短文・テンポ重視
- 50〜60秒: オチ。可能なら冒頭に自然につながる
- narrationは音声合成で読み上げるので自然な日本語の話し言葉にする
- subtitleはスマホで読める短い文にする(感嘆符・強調も適度に使う)
- 事実確認できない情報は「諸説あります」等の表現を使う(断定しない)
- 実在の配信者・YouTuber個人の映像やエピソードを題材にしないこと(オリジナル台本のみ)
- 他の動画のコピーではなく、完全にオリジナルの台本にする
- タイトル(title)は本文(scenes)で実際に語る内容の範囲を超えて誇張しないこと
  (タイトルと中身が一致しない釣りタイトルは厳禁。実況テンションの高さと事実の誇張は別物)`;

export async function generateScript(idea: Idea) {
  try {
    const prompt = `以下の企画からYouTube Shorts台本を生成してください。

タイトル案: ${idea.title}
ジャンル: ${idea.genre}
ターゲット: ${idea.targetAudience}
フック方針: ${idea.hook}
概要: ${idea.summary}

シーンは6〜10個程度に分割し、各シーンの start/end(秒)、visual(映像内容)、narration(ナレーション)、
subtitle(字幕)、sfx(効果音)を指定してください。`;

    const script = await generateJson<RawScript>(prompt, SCRIPT_SCHEMA, {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.9,
    });

    // リトライ時に同じideaIdで再実行されてもユニーク制約に落ちないようupsertする
    const created = await prisma.script.upsert({
      where: { ideaId: idea.id },
      create: {
        ideaId: idea.id,
        title: script.title,
        duration: script.duration,
        hook: script.hook,
        ending: script.ending,
        description: script.description,
        hashtags: JSON.stringify(script.hashtags),
        keywords: JSON.stringify(script.keywords),
        rawJson: JSON.stringify(script),
        scenes: {
          create: script.scenes.map((s, idx) => ({
            order: idx,
            startSec: s.start,
            endSec: s.end,
            visual: s.visual,
            narration: s.narration,
            subtitle: s.subtitle,
            sfx: s.sfx,
          })),
        },
      },
      update: {},
      include: { scenes: true },
    });

    await prisma.idea.update({ where: { id: idea.id }, data: { status: "PRODUCED" } });

    return created;
  } catch (err) {
    await logError("ScriptAgent", err, { ideaId: idea.id });
    return null;
  }
}

export function getFullNarration(scenes: { narration: string | null }[]): string {
  return scenes.map((s) => s.narration ?? "").join("");
}
