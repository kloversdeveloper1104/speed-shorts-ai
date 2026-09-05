// Gemini API クライアント。モデル名は管理画面の「設定」ページ(DB)、
// 未設定の場合は .env の GEMINI_MODEL から取得し、コードを変更せずに切り替えられるようにする。

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { env, getGeminiModel } from "@/utils/env";
import { prisma } from "@/database/client";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY が設定されていません。.env に Gemini APIキーを設定してください。(https://aistudio.google.com/app/apikey)"
    );
  }
  if (!client) {
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

/** 管理画面「設定」で選択されたモデルを優先し、無ければ.envのGEMINI_MODELを使う */
async function resolveModelName(): Promise<string> {
  try {
    const channel = await prisma.channel.findFirst({ select: { geminiModel: true } });
    if (channel?.geminiModel) return channel.geminiModel;
  } catch {
    // DB未接続時などは.envにフォールバック
  }
  return getGeminiModel();
}

export interface GenerateTextOptions {
  systemInstruction?: string;
  temperature?: number;
  jsonSchema?: Record<string, unknown>;
}

const REQUEST_TIMEOUT_MS = 45000;
const MAX_RETRIES = 4;
const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000];

function isTransientError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("503") ||
    message.includes("high demand") ||
    message.includes("aborted") ||
    message.includes("ECONNRESET") ||
    message.includes("fetch failed") ||
    message.includes("429")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 一時的な混雑(503/429/タイムアウト)はバックオフしながらリトライする */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_RETRIES || !isTransientError(err)) throw err;
      const delay = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      console.warn(
        `Gemini API 一時エラー、${delay / 1000}秒後にリトライします (${attempt + 1}/${MAX_RETRIES}): ${
          lastErr instanceof Error ? lastErr.message : String(lastErr)
        }`
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

/** プレーンテキスト生成 */
export async function generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
  const modelName = await resolveModelName();
  return withRetry(async () => {
    const model = getClient().getGenerativeModel({
      model: modelName,
      systemInstruction: options.systemInstruction,
    });

    const result = await model.generateContent(
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.9,
        },
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    return result.response.text();
  });
}

/** JSON出力を強制した生成。Gemini の responseSchema 機能を使用する。 */
export async function generateJson<T = unknown>(
  prompt: string,
  schema: Record<string, unknown>,
  options: GenerateTextOptions = {}
): Promise<T> {
  const modelName = await resolveModelName();
  return withRetry(async () => {
    const model = getClient().getGenerativeModel({
      model: modelName,
      systemInstruction: options.systemInstruction,
    });

    const result = await model.generateContent(
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.8,
          responseMimeType: "application/json",
          responseSchema: schema as never,
        },
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    const text = result.response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Geminiの出力がJSONとして解析できませんでした: ${text.slice(0, 500)}`);
    }
  });
}

export { SchemaType };

/** 接続確認用の疎通テスト */
export async function testGeminiConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const text = await generateText("「接続成功」という2文字だけを出力してください。", {
      temperature: 0,
    });
    return { ok: true, message: text.trim() };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
