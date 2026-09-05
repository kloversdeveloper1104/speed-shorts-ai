// ジョブシステム(仕様書 36, 37節)
// リトライ最大3回。失敗してもシステム全体は止めない。

import { prisma } from "@/database/client";
import { logError } from "@/utils/logger";

export type JobType =
  | "TREND_COLLECT"
  | "VIRAL_ANALYZE"
  | "IDEA_GENERATE"
  | "SCRIPT_GENERATE"
  | "ASSET_GENERATE"
  | "VIDEO_EDIT"
  | "QUALITY_CHECK"
  | "UPLOAD"
  | "ANALYTICS";

export async function createJob(type: JobType, payload?: Record<string, unknown>) {
  return prisma.job.create({
    data: { type, payload: payload ? JSON.stringify(payload) : null, status: "PENDING" },
  });
}

export async function runJob<T>(jobId: string, fn: () => Promise<T>): Promise<T | null> {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    const result = await fn();
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "DONE", result: JSON.stringify(result ?? null), finishedAt: new Date() },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retryCount = job.retryCount + 1;
    const failed = retryCount >= job.maxRetries;

    await logError("JobRunner", err, { jobId, type: job.type });

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: failed ? "FAILED" : "PENDING",
        retryCount,
        errorMessage: message,
        finishedAt: failed ? new Date() : null,
      },
    });

    if (!failed) {
      // 呼び出し元のループが次回再実行する想定(自動再実行はauto.ts側で制御)
      return null;
    }
    return null;
  }
}

export async function getPendingJobs(type?: JobType) {
  return prisma.job.findMany({
    where: { status: "PENDING", type },
    orderBy: { createdAt: "asc" },
  });
}
