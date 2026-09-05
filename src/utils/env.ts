// .envの読み込みと必須項目の検証を一元管理する

export interface EnvStatus {
  key: string;
  present: boolean;
  required: boolean;
  label: string;
}

const REQUIRED_FOR_BASIC: Array<{ key: string; label: string; required: boolean }> = [
  { key: "GEMINI_API_KEY", label: "Gemini APIキー", required: true },
  { key: "YOUTUBE_CLIENT_ID", label: "YouTube OAuthクライアントID", required: true },
  { key: "YOUTUBE_CLIENT_SECRET", label: "YouTube OAuthクライアントシークレット", required: true },
  { key: "YOUTUBE_REFRESH_TOKEN", label: "YouTube OAuthリフレッシュトークン(初回認証で自動取得)", required: false },
  { key: "DATABASE_URL", label: "データベースURL", required: true },
];

export function checkEnvStatus(): EnvStatus[] {
  return REQUIRED_FOR_BASIC.map((item) => ({
    key: item.key,
    label: item.label,
    required: item.required,
    present: !!process.env[item.key] && process.env[item.key] !== "",
  }));
}

export function getMissingRequiredEnv(): EnvStatus[] {
  return checkEnvStatus().filter((s) => s.required && !s.present);
}

export function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export function getGeminiModel(): string {
  return env("GEMINI_MODEL", "gemini-3.5-flash-lite");
}

export function getQualityThreshold(): number {
  const v = Number(env("QUALITY_THRESHOLD", "85"));
  return Number.isFinite(v) ? v : 85;
}

export function getAutoMode(): "OFF" | "SAFE" | "FULL" {
  const v = env("AUTO_MODE", "OFF").toUpperCase();
  if (v === "SAFE" || v === "FULL") return v;
  return "OFF";
}
