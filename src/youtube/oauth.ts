// YouTube (Google) OAuth 2.0 認証フロー
// 初回のみユーザーがブラウザでGoogleにログインし、以降はリフレッシュトークンで自動運用する。
// トークンはAES-256-GCMで暗号化して tokens/youtube_token.enc に保存する(.env・GitHubには保存しない)。

import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { env } from "@/utils/env";
import { encryptSecret, decryptSecret } from "@/utils/crypto";

const TOKEN_PATH = path.join(process.cwd(), "tokens", "youtube_token.enc");

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

export function getOAuthClient() {
  const clientId = env("YOUTUBE_CLIENT_ID");
  const clientSecret = env("YOUTUBE_CLIENT_SECRET");
  const redirectUri = env("YOUTUBE_REDIRECT_URI", "http://localhost:3000/api/auth/youtube/callback");

  if (!clientId || !clientSecret) {
    throw new Error(
      "YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET が未設定です。Google Cloud ConsoleでOAuthクライアント(デスクトップアプリ)を作成し、.envに設定してください。"
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // 常にrefresh_tokenを取得するため
    scope: SCOPES,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "refresh_tokenが取得できませんでした。Googleアカウントの権限設定から本アプリのアクセスを削除し、再度認証してください(prompt=consentが必要です)。"
    );
  }
  saveTokens(tokens);
  return tokens;
}

function saveTokens(tokens: object) {
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  const encrypted = encryptSecret(JSON.stringify(tokens));
  fs.writeFileSync(TOKEN_PATH, encrypted, { mode: 0o600 });
}

export function loadTokens(): Record<string, unknown> | null {
  const refreshTokenFromEnv = env("YOUTUBE_REFRESH_TOKEN");
  if (fs.existsSync(TOKEN_PATH)) {
    const encrypted = fs.readFileSync(TOKEN_PATH, "utf8");
    return JSON.parse(decryptSecret(encrypted));
  }
  if (refreshTokenFromEnv) {
    return { refresh_token: refreshTokenFromEnv };
  }
  return null;
}

export function isYoutubeAuthenticated(): boolean {
  return loadTokens() !== null;
}

/** 認証済みクライアントを取得。未認証の場合は null を返す。 */
export function getAuthenticatedClient() {
  const tokens = loadTokens();
  if (!tokens) return null;
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
  oauth2Client.on("tokens", (newTokens) => {
    saveTokens({ ...tokens, ...newTokens });
  });
  return oauth2Client;
}
