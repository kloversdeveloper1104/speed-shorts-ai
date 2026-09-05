import { prisma } from "@/database/client";

export async function logError(source: string, err: unknown, context?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[${source}] ${message}`);
  try {
    await prisma.errorLog.create({
      data: {
        source,
        message,
        stack,
        context: context ? JSON.stringify(context) : null,
      },
    });
  } catch {
    // DB自体に書き込めない場合はコンソール出力のみで諦める(無限ループ防止)
  }
}
