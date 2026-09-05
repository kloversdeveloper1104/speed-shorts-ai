# YouTube Shorts AI 自動運用システム

AIが「市場調査 → 企画 → 台本 → 動画制作 → 品質チェック → YouTube投稿 → 分析 → 改善」
を継続的に自動運用する、YouTube Shorts運営マネージャーシステムです。

対象チャンネル: `kloversmovie@gmail.com`
メインターゲット: 日本人30代男性

---

## 1. 必要ソフト

- [Node.js](https://nodejs.org/) 20以上(確認済み: v24)
- [FFmpeg](https://ffmpeg.org/)(動画編集に使用)
- Googleアカウント(`kloversmovie@gmail.com`)

## 2. Node.js確認

```bash
node -v
npm -v
```

## 3. FFmpeg確認

Windowsの場合、以下のコマンドでインストールできます(winget使用):

```bash
winget install --id Gyan.FFmpeg -e
```

インストール後、以下で確認してください:

```bash
ffmpeg -version
```

## 4. Google Cloud設定

1. https://console.cloud.google.com/ を開く
2. 新しいプロジェクトを作成(または既存プロジェクトを選択)
3. 「APIとサービス」→「有効なAPIとサービス」で以下を有効化
   - YouTube Data API v3
   - YouTube Analytics API
4. 「認証情報」→「認証情報を作成」→「OAuthクライアントID」
   - アプリケーションの種類: **デスクトップアプリ**
5. 発行された「クライアントID」と「クライアントシークレット」を控えておく

## 5. YouTube API設定

`.env.example` を `.env` にコピーし、以下を設定します。

```bash
cp .env.example .env
```

```
YOUTUBE_CLIENT_ID=(手順4で取得したクライアントID)
YOUTUBE_CLIENT_SECRET=(手順4で取得したクライアントシークレット)
```

## 6. Gemini API設定

1. https://aistudio.google.com/app/apikey を開く
2. 「Create API Key」でAPIキーを発行
3. `.env` に設定

```
GEMINI_API_KEY=(発行したAPIキー)
GEMINI_MODEL=gemini-3.5-flash-lite
```

モデル名は `.env` の変更のみで切り替え可能です(コード変更不要)。

## 6.5. Pexels API設定(無料・推奨)

シーン内容に合う実写/イラスト写真を動画に使う場合に設定します(未設定でも動画は生成できます)。

1. https://www.pexels.com/api/ を開く
2. 「Get Started」からアカウント作成(無料)、APIキーを取得
3. `.env` に設定

```
PEXELS_API_KEY=(発行したAPIキー)
```

## 7. .env設定

上記に加え、最低限以下も確認してください(初期値のままで動作します)。

```
DATABASE_URL="file:./dev.db"
VOICE_PROVIDER=edge-tts
AUTO_MODE=OFF
QUALITY_THRESHOLD=85
```

## 8. 依存関係のインストール・DB初期化

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

## 9. 管理画面の起動

```bash
npm run dev
```

http://localhost:3000 を開くと自動的に `/setup`(セットアップウィザード)へ誘導されます。

## 10. OAuth認証

セットアップウィザードの STEP 1 から「Googleでログイン」を押し、
`kloversmovie@gmail.com` でログインして権限を許可してください。
成功すると認証情報は暗号化されて `tokens/` フォルダに保存されます
(GitHubにはアップロードされません)。

## 11. 初回テスト

セットアップウィザードの STEP 6「GENERATE TEST VIDEO」を押すと、
企画→台本→音声→映像→字幕→編集→Quality Checkまでを自動実行します。
数分かかる場合があります。

## 12. 非公開投稿テスト

生成されたテスト動画は「動画」ページの「レビュー待ち」に表示されます。
公開設定を「非公開」のまま「承認して投稿」を押すとYouTubeへアップロードされます。
正常にアップロードできることを確認したら、「限定公開」→「公開」の順に上げていってください。

## 13. SAFE MODE

「設定」ページで `AUTO_MODE` を **SAFE** にすると、
AIが動画を自動生成し、人間が「動画」ページで承認したものだけが投稿されます。

## 14. FULL AUTO

運用が安定したら `AUTO_MODE` を **FULL** にすると、
品質チェック(`QUALITY_THRESHOLD`点以上)を通過した動画が自動投稿されます。

常時運用する場合は以下のワーカーをバックグラウンドで起動してください
(06:00 トレンド収集 / 07:00 バズ分析 / 08:00 企画生成 / 12:00・20:00 投稿サイクル / 随時Analytics取得)。

```bash
npm run worker
```

1回だけ手動でAUTOサイクルを実行したい場合:

```bash
npm run auto
```

## 15. 停止方法

- 管理画面: `Ctrl + C`
- ワーカー: `Ctrl + C`
- 完全に自動投稿を止めたい場合は「設定」ページで `AUTO_MODE` を `OFF` にしてください。

## 16. ログ確認

管理画面の「ログ」ページでエラーログを確認できます。
またコンソール(ターミナル)にも出力されます。

## 17. エラー対処

- **FFmpegが見つからない**: 手順3を再確認し、PCを再起動してください。
- **Gemini API接続エラー**: `.env` の `GEMINI_API_KEY` を確認し、セットアップウィザードSTEP 3の「Gemini接続テスト」で確認してください。
- **YouTube認証エラー**: Google Cloud Consoleで対象APIが有効化されているか、OAuth同意画面にテストユーザーとして `kloversmovie@gmail.com` が追加されているか確認してください。
- **動画アップロード失敗**: YouTubeチャンネルの認証状態(電話番号確認など)を確認してください。

---

## セキュリティに関する注意

- Googleパスワード・APIキー・OAuthトークンはコードやGitHubに含まれません。
- OAuthトークンは `tokens/` フォルダに暗号化して保存されます。
- `.gitignore` により `.env` / `tokens/` / `credentials/` はGit管理対象外です。

## プロジェクト構成

```
src/
  agents/      各AIエージェント(trend/viral/idea/script/visual/voice/editor/quality/upload/analytics/strategy)
  youtube/     YouTube Data API / Analytics API / OAuth
  gemini/      Gemini APIクライアント
  video/       FFmpeg動画生成・字幕・BGM・音声合成
  database/    Prismaクライアント
  scheduler/   ジョブシステム・自動運用パイプライン
  app/         管理画面(Next.js)
prisma/        データベーススキーマ
storage/       生成された動画・音声・アセット
```
