// Buzz Score計算ロジック(仕様書 8節)
// 単純な再生数ランキングではなく、複数指標を統合する。
// 「小規模チャンネルなのに異常に再生されている」動画を優先。

export interface BuzzScoreInput {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  subscriberCount: number;
  publishedAt: Date;
}

export function computeBuzzScore(input: BuzzScoreInput): number {
  const { viewCount, likeCount, commentCount, subscriberCount, publishedAt } = input;

  const hoursSincePublish = Math.max(
    1,
    (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60)
  );

  // 再生速度: 経過時間あたりの再生数(対数圧縮)
  const viewVelocity = viewCount / hoursSincePublish;
  const velocityScore = Math.log10(viewVelocity + 1) * 10;

  // 登録者数に対する再生数の倍率(小規模チャンネルの異常バズを検出)
  const subs = Math.max(subscriberCount, 100); // ゼロ割回避 + 極小チャンネル補正
  const viewToSubRatio = viewCount / subs;
  const overperformanceScore = Math.min(Math.log10(viewToSubRatio + 1) * 15, 40);

  // 小規模チャンネルボーナス(登録者1万未満で再生数がそれを大きく上回る場合)
  const smallChannelBonus = subscriberCount < 10000 && viewToSubRatio > 5 ? 15 : 0;

  // エンゲージメント率
  const likeRate = viewCount > 0 ? (likeCount / viewCount) * 100 : 0;
  const commentRate = viewCount > 0 ? (commentCount / viewCount) * 100 : 0;
  const engagementScore = Math.min(likeRate * 3 + commentRate * 5, 20);

  // 生の再生数スコア(対数圧縮)
  const rawViewScore = Math.min(Math.log10(viewCount + 1) * 5, 15);

  const total =
    velocityScore + overperformanceScore + smallChannelBonus + engagementScore + rawViewScore;

  return Math.round(total * 10) / 10;
}
