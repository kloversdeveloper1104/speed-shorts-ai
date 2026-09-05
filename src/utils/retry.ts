// AI APIエラー等が発生しても全体停止しないためのリトライユーティリティ(仕様書37節)
// 最大3回リトライする。

import { logError } from "./logger";

export async function withRetry<T>(
  source: string,
  fn: () => Promise<T | null>,
  maxRetries = 3
): Promise<T | null> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (result !== null) return result;
      lastError = new Error("結果がnullでした");
    } catch (err) {
      lastError = err;
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  await logError(source, lastError, { maxRetries });
  return null;
}
