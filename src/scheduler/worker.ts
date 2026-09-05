// 常駐スケジューラー(仕様書 36節)
// 06:00 Trend収集 / 07:00 Viral分析 / 08:00 Idea生成
// 投稿サイクルは約60分間隔(±15分のランダムジッター)で実行し、
// 1日の投稿数がmaxPostsPerDayに達したらその日はスキップする / 23:30 戦略分析 / 随時 Analytics測定
//
// ローカルPCを常時起動しておく運用向け。PCを消していても投稿を続けたい場合は
// GitHub Actions(.github/workflows/scheduler.yml + ci-run.ts)を使う。

import "dotenv/config";
import { runTask, checkAnalytics } from "./tasks";

const FIXED_SCHEDULE: Array<{ hour: number; minute: number; task: string }> = [
  { hour: 6, minute: 0, task: "TREND" },
  { hour: 7, minute: 0, task: "VIRAL" },
  { hour: 8, minute: 0, task: "IDEA" },
  { hour: 23, minute: 30, task: "STRATEGY" },
];

const CYCLE_INTERVAL_BASE_MIN = 60;
const CYCLE_INTERVAL_JITTER_MIN = 15;

/** 次回CYCLE実行時刻を、約60分±15分のランダム間隔で決める */
function scheduleNextCycle(from: Date): Date {
  const jitter = (Math.random() * 2 - 1) * CYCLE_INTERVAL_JITTER_MIN; // -15〜+15分
  const minutes = CYCLE_INTERVAL_BASE_MIN + jitter;
  return new Date(from.getTime() + minutes * 60 * 1000);
}

let nextCycleAt: Date | null = null;
const ranToday = new Set<string>();
let isTicking = false;

async function tick() {
  // setIntervalは前回のtick()完了を待たないため、1分ごとの発火が重なると
  // CYCLEが多重実行される(重複投稿)バグがあった。再入防止ロックで防ぐ。
  if (isTicking) return;
  isTicking = true;
  try {
    await doTick();
  } finally {
    isTicking = false;
  }
}

async function doTick() {
  const now = new Date();
  const key = `${now.toDateString()}-${now.getHours()}-${now.getMinutes()}`;

  for (const s of FIXED_SCHEDULE) {
    if (now.getHours() === s.hour && now.getMinutes() === s.minute) {
      const taskKey = `${key}-${s.task}-${s.hour}:${s.minute}`;
      if (!ranToday.has(taskKey)) {
        ranToday.add(taskKey);
        await runTask(s.task);
      }
    }
  }

  // CYCLE(投稿)は約60分±15分のランダム間隔で実行(1日の上限はrunTask内でチェック)
  // 次回時刻は実行"前"に予約する(実行中に再度条件を満たして多重実行されるのを防ぐ)
  if (!nextCycleAt) nextCycleAt = scheduleNextCycle(now);
  if (now >= nextCycleAt) {
    nextCycleAt = scheduleNextCycle(now);
    await runTask("CYCLE");
  }

  // 古いキーを掃除(メモリリーク防止)
  if (ranToday.size > 1000) ranToday.clear();

  await checkAnalytics();
}

async function main() {
  console.log("YouTube Shorts AI ワーカーを起動しました。1分間隔でスケジュールを確認します。");
  await tick();
  setInterval(() => {
    tick().catch((err) => console.error("[Worker] tick error:", err));
  }, 60 * 1000);
}

main();
