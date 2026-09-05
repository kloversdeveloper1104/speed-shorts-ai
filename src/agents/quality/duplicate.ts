// 重複検出(仕様書 48節): タイトル・台本・テーマ・字幕・構成を過去動画と比較する

import { prisma } from "@/database/client";

const SIMILARITY_THRESHOLD = 0.6;

function bigrams(text: string): Set<string> {
  const normalized = text.replace(/\s+/g, "");
  const set = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i++) {
    set.add(normalized.slice(i, i + 2));
  }
  return set;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) {
    if (b.has(x)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  mostSimilarScriptId?: string;
  similarity: number;
}

export async function checkDuplicate(
  title: string,
  fullText: string,
  excludeScriptId?: string
): Promise<DuplicateCheckResult> {
  const pastScripts = await prisma.script.findMany({
    where: excludeScriptId ? { id: { not: excludeScriptId } } : undefined,
    include: { scenes: true },
    take: 200,
    orderBy: { createdAt: "desc" },
  });

  const targetGrams = bigrams(title + fullText);
  let best = { similarity: 0, scriptId: undefined as string | undefined };

  for (const past of pastScripts) {
    const pastText =
      past.title + past.scenes.map((s) => s.subtitle ?? "").join("") + (past.description ?? "");
    const sim = jaccardSimilarity(targetGrams, bigrams(pastText));
    if (sim > best.similarity) {
      best = { similarity: sim, scriptId: past.id };
    }
  }

  return {
    isDuplicate: best.similarity >= SIMILARITY_THRESHOLD,
    mostSimilarScriptId: best.scriptId,
    similarity: Math.round(best.similarity * 1000) / 1000,
  };
}
