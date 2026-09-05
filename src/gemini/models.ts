// 管理画面「設定」で選べるGeminiモデルのプリセット。
// 実機検証済み(2026-09-04時点): flash-lite系は高速・安定・無料枠向け。
// 無印flash系(3.6/3.7等)は機能は高いが混雑時にタイムアウト・503が発生しやすい。

export interface GeminiModelPreset {
  id: string;
  label: string;
  description: string;
}

export const GEMINI_MODEL_PRESETS: GeminiModelPreset[] = [
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite(推奨・無料枠向け)",
    description: "最も高速・安定。ランニングコストを抑えたい場合はこれ。",
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite(高速・代替)",
    description: "3.5系が混雑している場合の代替候補。",
  },
  {
    id: "gemini-flash-lite-latest",
    label: "Gemini Flash-Lite Latest(常に最新軽量版)",
    description: "Googleが自動的に最新のFlash-Liteへ切り替える追従版。",
  },
  {
    id: "gemini-3.7-flash",
    label: "Gemini 3.7 Flash(高機能・やや低速)",
    description: "flash-liteより高精度だが応答が遅く混雑しやすい。",
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash(最新機能)",
    description: "最新の機能を持つが、混雑時にタイムアウトしやすい。",
  },
];

export const DEFAULT_GEMINI_MODEL = GEMINI_MODEL_PRESETS[0].id;

export function isPresetModel(modelId: string): boolean {
  return GEMINI_MODEL_PRESETS.some((p) => p.id === modelId);
}
