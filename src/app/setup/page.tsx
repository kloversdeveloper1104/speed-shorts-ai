import { checkEnvStatus, env } from "@/utils/env";
import { isYoutubeAuthenticated } from "@/youtube/oauth";
import { getMyChannel } from "@/youtube/client";
import { Card, PageHeader, Badge } from "@/components/ui";
import { GeminiTestButton, GenerateTestVideoButton } from "@/components/SetupActions";
import { prisma } from "@/database/client";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

async function safeGetChannel() {
  try {
    const channel = await getMyChannel();
    if (channel?.id) {
      // 確認できたYouTubeチャンネル情報をDBへ同期する
      await prisma.channel.upsert({
        where: { youtubeChannelId: channel.id },
        create: {
          youtubeChannelId: channel.id,
          googleAccountEmail: "kloversmovie@gmail.com",
          title: channel.snippet?.title,
          subscriberCount: Number(channel.statistics?.subscriberCount ?? 0),
        },
        update: {
          title: channel.snippet?.title,
          subscriberCount: Number(channel.statistics?.subscriberCount ?? 0),
        },
      });
    }
    return channel;
  } catch {
    return null;
  }
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ auth_success?: string; auth_error?: string }>;
}) {
  const params = await searchParams;
  const envStatus = checkEnvStatus();
  const youtubeAuthed = isYoutubeAuthenticated();
  const ytChannel = youtubeAuthed ? await safeGetChannel() : null;
  const geminiKeyPresent = envStatus.find((e) => e.key === "GEMINI_API_KEY")?.present ?? false;
  const ffmpegAvailable = await checkFfmpeg();
  const pexelsConfigured = !!env("PEXELS_API_KEY");
  const bgmDir = path.join(process.cwd(), "storage", "assets", "bgm");
  const bgmCount = fs.existsSync(bgmDir)
    ? fs.readdirSync(bgmDir).filter((f) => /\.(mp3|wav|m4a)$/i.test(f)).length
    : 0;

  return (
    <div>
      <PageHeader title="初回セットアップウィザード" description="YouTube AI運用セットアップ" />

      {params.auth_success && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-900/40 text-emerald-300 text-sm">
          Google OAuth認証に成功しました。
        </div>
      )}
      {params.auth_error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-900/40 text-rose-300 text-sm">
          認証エラー: {params.auth_error}
        </div>
      )}

      <div className="space-y-4">
        <StepCard
          step={1}
          title="Google OAuth"
          done={youtubeAuthed}
          description="kloversmovie@gmail.com でログインし、YouTubeへのアクセスを許可します。"
        >
          {!envStatus.find((e) => e.key === "YOUTUBE_CLIENT_ID")?.present ? (
            <MissingEnvHelp
              items={[
                "1. https://console.cloud.google.com/ を開く",
                "2. 新しいプロジェクトを作成(または既存プロジェクトを選択)",
                "3. 「APIとサービス」→「有効なAPIとサービス」で「YouTube Data API v3」と「YouTube Analytics API」を有効化",
                "4. 「認証情報」→「認証情報を作成」→「OAuthクライアントID」→アプリケーションの種類は「デスクトップアプリ」を選択",
                "5. 発行されたクライアントIDとクライアントシークレットを .env の YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET に貼り付ける",
                "6. サーバーを再起動してこのページを再読み込みする",
              ]}
            />
          ) : youtubeAuthed ? (
            <p className="text-sm text-emerald-400">✓ 認証済みです</p>
          ) : (
            <div>
              <p className="text-sm text-slate-400 mb-3">
                下のボタンを押すとGoogleのログイン画面が開きます。kloversmovie@gmail.com でログインし、
                「YouTubeを管理する」権限を許可してください。
              </p>
              <a
                href="/api/auth/youtube"
                className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white"
              >
                Googleでログイン
              </a>
            </div>
          )}
        </StepCard>

        <StepCard
          step={2}
          title="YouTubeチャンネル確認"
          done={!!ytChannel}
          description="アップロード権限のあるチャンネルが存在するか確認します。"
        >
          {ytChannel ? (
            <p className="text-sm text-emerald-400">
              ✓ チャンネル「{ytChannel.snippet?.title}」(登録者
              {ytChannel.statistics?.subscriberCount ?? "0"}人)を確認しました
            </p>
          ) : (
            <p className="text-sm text-slate-500">STEP 1の認証完了後に自動確認されます。</p>
          )}
        </StepCard>

        <StepCard
          step={3}
          title="Gemini API"
          done={geminiKeyPresent}
          description="企画・台本生成に使用するGemini APIキーを設定します。"
        >
          {!geminiKeyPresent ? (
            <MissingEnvHelp
              items={[
                "1. https://aistudio.google.com/app/apikey を開く",
                "2. 「Create API Key」でAPIキーを発行",
                "3. .env の GEMINI_API_KEY に貼り付ける",
                "4. サーバーを再起動する",
              ]}
            />
          ) : (
            <GeminiTestButton />
          )}
        </StepCard>

        <StepCard
          step={4}
          title="動画生成設定"
          done={ffmpegAvailable}
          description="Pexels(無料フリー素材)でシーンに合う写真を検索し、FFmpegでKen Burnsズーム動画化します。"
        >
          <p className={`text-sm ${ffmpegAvailable ? "text-emerald-400" : "text-rose-400"}`}>
            {ffmpegAvailable ? "✓ FFmpegが利用可能です" : "✗ FFmpegが見つかりません"}
          </p>
          {pexelsConfigured ? (
            <p className="text-sm text-emerald-400 mt-1">✓ PEXELS_API_KEY 設定済み(フリー素材写真を使用)</p>
          ) : (
            <MissingEnvHelp
              items={[
                "1. https://www.pexels.com/api/ を開く(無料)",
                "2. 「Get Started」→アカウント作成→APIキーが発行されます",
                "3. .env の PEXELS_API_KEY に貼り付ける",
                "4. サーバーを再起動する(未設定でも動画生成自体は可能。グラデーション+テキストにフォールバックします)",
              ]}
            />
          )}
        </StepCard>

        <StepCard
          step={5}
          title="音声設定"
          done={true}
          description="デフォルトで無料のMicrosoft Edge TTS(日本語男性ボイス)を使用します。APIキーは不要です。"
        >
          <p className="text-sm text-emerald-400">✓ VOICE_PROVIDER=edge-tts (追加設定不要)</p>
          <p className="text-xs text-slate-500 mt-2">
            BGM: storage/assets/bgm/ に配置済みファイル {bgmCount} 件(未配置の場合は自動生成の簡易BGMを使用)
          </p>
        </StepCard>

        <StepCard
          step={6}
          title="テスト動画"
          done={false}
          description="企画→台本→音声→映像→字幕→編集→Quality Checkまでを1本実行します。"
        >
          <GenerateTestVideoButton disabled={!geminiKeyPresent} />
        </StepCard>

        <StepCard
          step={7}
          title="YouTube投稿テスト"
          done={false}
          description="生成したテスト動画を「非公開」でYouTubeへアップロードします。「動画」ページから実行してください。"
        >
          <p className="text-sm text-slate-500">
            STEP 6完了後、サイドバーの「動画」ページのレビュー待ち欄から「承認して投稿」(非公開)を実行してください。
          </p>
        </StepCard>

        <StepCard
          step={8}
          title="AUTO MODE"
          done={false}
          description="SAFE(人間承認あり)またはFULL(完全自動)を「設定」ページから有効化できます。"
        >
          <p className="text-sm text-slate-500">
            STEP 1〜7が完了したら、「設定」ページでAUTO_MODEをSAFEに切り替えることを推奨します。
          </p>
        </StepCard>
      </div>
    </div>
  );
}

async function checkFfmpeg(): Promise<boolean> {
  try {
    const { spawn } = await import("child_process");
    return await new Promise((resolve) => {
      const proc = spawn("ffmpeg", ["-version"], { windowsHide: true });
      proc.on("error", () => resolve(false));
      proc.on("close", (code) => resolve(code === 0));
    });
  } catch {
    return false;
  }
}

function StepCard({
  step,
  title,
  description,
  done,
  children,
}: {
  step: number;
  title: string;
  description: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-2">
        <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0">
          {step}
        </span>
        <h3 className="font-semibold">{title}</h3>
        <Badge color={done ? "green" : "gray"}>{done ? "完了" : "未完了"}</Badge>
      </div>
      <p className="text-sm text-slate-400 mb-3">{description}</p>
      {children}
    </Card>
  );
}

function MissingEnvHelp({ items }: { items: string[] }) {
  return (
    <div className="bg-amber-950/40 border border-amber-900 rounded-lg p-3">
      <p className="text-xs text-amber-300 font-medium mb-2">ユーザー操作が必要です:</p>
      <ol className="text-xs text-amber-200 space-y-1">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    </div>
  );
}
