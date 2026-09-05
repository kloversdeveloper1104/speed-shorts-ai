// 企画スコアリング(仕様書 13節)
// Target Fit 20 / Hook 20 / Novelty 15 / Information Value 15 / Comment Potential 10 / Visual Potential 10 / Originality 10

export interface IdeaScoreBreakdown {
  targetFit: number;
  hook: number;
  novelty: number;
  informationValue: number;
  commentPotential: number;
  visualPotential: number;
  originality: number;
}

export const IDEA_SCORE_WEIGHTS: Record<keyof IdeaScoreBreakdown, number> = {
  targetFit: 20,
  hook: 20,
  novelty: 15,
  informationValue: 15,
  commentPotential: 10,
  visualPotential: 10,
  originality: 10,
};

export function computeIdeaTotalScore(breakdown: IdeaScoreBreakdown): number {
  const total = Object.entries(breakdown).reduce((sum, [key, value]) => {
    const weight = IDEA_SCORE_WEIGHTS[key as keyof IdeaScoreBreakdown];
    // Geminiには0-100のサブスコアを出させ、重みで按分する
    return sum + (value / 100) * weight;
  }, 0);
  return Math.round(total * 10) / 10;
}

export type IdeaTier = "REJECTED" | "CANDIDATE" | "PRIORITY";

export function getIdeaTier(totalScore: number): IdeaTier {
  if (totalScore >= 90) return "PRIORITY";
  if (totalScore >= 80) return "CANDIDATE";
  if (totalScore >= 70) return "CANDIDATE"; // 70-79も一応候補扱い、80未満は優先度低
  return "REJECTED";
}
