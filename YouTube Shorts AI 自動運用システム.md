# YouTube Shorts AI 自動運用システム
## Claude Code 完全実装指示書 v2.0

あなたはシニアソフトウェアエンジニア、AIエージェント開発者、動画生成システム開発者、YouTube Shortsマーケターです。

この仕様書を元に、YouTube ShortsチャンネルをAIで継続運用するためのシステムを、実際に動作するところまで構築してください。

---

# 0. 最重要ミッション

このプロジェクトの目的は、

「YouTube ShortsをAIで継続的に企画・制作・投稿・分析・改善する自動運用システム」

を作ることです。

最終的には、

YouTube市場調査
↓
伸びている動画の発見
↓
動画構造分析
↓
30代男性向け企画生成
↓
台本生成
↓
映像生成
↓
ナレーション生成
↓
字幕生成
↓
BGM・効果音
↓
動画編集
↓
AI品質チェック
↓
YouTube Shorts投稿
↓
Analytics取得
↓
成功/失敗分析
↓
次の企画へフィードバック

というループを自動化してください。

単なる動画生成アプリではなく、

「AI YouTube運営マネージャー」

を作ることが目標です。

---

# 1. YouTubeアカウント

使用するGoogleアカウント：

kloversmovie@gmail.com

このGoogleアカウントは既に作成済み。

Gmailアカウント作成処理は実装不要。

ただし、Google OAuth認証は必要になるため、

「初回だけユーザーがGoogleの認証画面を操作」
↓
「認証情報を安全に保存」
↓
「以降は自動運用」

という設計にしてください。

パスワードを取得・保存・コードへ記載してはいけません。

---

# 2. YouTubeチャンネル

Googleアカウント：

kloversmovie@gmail.com

をYouTube Shorts運用アカウントとして使用。

初回起動時に、

・YouTubeチャンネルが存在するか
・YouTube APIが利用可能か
・OAuth認証済みか
・アップロード権限があるか

をチェックする。

不足している場合は管理画面に、

「必要な設定」

として表示する。

---

# 3. ターゲット

メインターゲット：

日本人30代男性

想定：

30〜39歳
会社員
スマートフォン中心
Shortsをスキマ時間に視聴
雑学
仕事
お金
生活
AI
心理
懐かしい話
テクノロジー

などに興味がある層。

---

# 4. チャンネル戦略

最初からジャンルを1つに固定しない。

AIがデータを収集し、

「30代男性に何が刺さっているのか」

を発見する。

初期カテゴリ：

・知らないと損する雑学
・30代男性向け雑学
・仕事
・お金
・節約
・AI
・心理学
・科学
・生活
・日本の雑学
・昔と今
・懐かしいもの
・商品の秘密
・身近な疑問
・ランキング
・比較
・意外な事実

ただし、

データが十分に蓄積されたら、

「伸びないカテゴリ」

を自動的に減らし、

「伸びるカテゴリ」

へ制作比率を寄せる。

---

# 5. AIエージェント構成

システムを以下のAIエージェントに分割する。

## TrendAgent

YouTube上のトレンドを調査。

## ViralAnalyzer

伸びている動画の構造を分析。

## IdeaAgent

新しいオリジナル企画を生成。

## ScriptAgent

Shorts台本を生成。

## VisualAgent

各シーンの映像・画像素材を設計。

## VoiceAgent

ナレーションを生成。

## EditorAgent

動画構成を作成。

## QualityAgent

完成動画を検査。

## UploadAgent

YouTubeへアップロード。

## AnalyticsAgent

投稿後のデータを分析。

## StrategyAgent

次の動画戦略を改善。

---

# 6. AIモデル

Gemini APIを使用する。

モデル名はコードへハードコードせず、

GEMINI_MODEL=

として.envから変更可能にする。

初期値は利用可能なGemini Flash系モデルを設定。

モデル変更によってコードを書き換える必要がない設計にする。

---

# 7. トレンド収集

YouTube Data APIを使用。

可能な範囲でShorts市場を調査。

取得：

・動画ID
・タイトル
・チャンネル
・公開日時
・再生数
・高評価数
・コメント数
・動画URL
・チャンネル登録者数
・動画時間
・取得日時

---

# 8. バズ動画判定

単純な再生数ランキングは禁止。

以下を総合してBuzz Scoreを作る。

再生数
再生速度
チャンネル登録者数
登録者数に対する再生数
高評価率
コメント率
公開からの経過時間
テーマのトレンド性

特に、

「小規模チャンネルなのに異常に再生されている」

動画を優先する。

---

# 9. バズ動画分析

重要。

他人の動画をコピーするためのシステムにはしない。

分析目的は、

「なぜこの動画が伸びたのか」

を理解すること。

分析項目：

・冒頭フック
・テーマ
・タイトル
・動画尺
・構成
・情報密度
・字幕量
・字幕位置
・画面切り替え速度
・ナレーション速度
・感情曲線
・オチ
・コメント誘発
・視聴継続理由
・ループ構造
・視聴者心理

---

# 10. Gemini分析JSON

Geminiから以下のようなJSONを取得する。

{
  "hook": "",
  "topic": "",
  "audience": "",
  "duration": 0,
  "structure": [],
  "hook_type": "",
  "narration_style": "",
  "subtitle_style": "",
  "scene_change_rate": 0,
  "emotion_curve": "",
  "ending_type": "",
  "comment_trigger": "",
  "retention_strategy": "",
  "why_it_works": [],
  "adaptation_ideas": [],
  "originality_risk": ""
}

---

# 11. オリジナル化

絶対に、

・台本コピー
・ナレーションコピー
・映像コピー
・字幕コピー
・音声コピー
・サムネイルコピー

をしない。

参考動画から、

「構造」

だけを抽出する。

例えば、

元動画：

「知らないと損する冷蔵庫の機能3選」

だった場合、

同じ動画を再現するのではなく、

「30代になったら知っておきたい家電の意外な機能」

など、別の企画へ変換する。

---

# 12. IdeaAgent

毎日最低10個の企画候補を生成。

各企画に、

・タイトル
・ジャンル
・対象
・フック
・概要
・Buzz Score
・Originality Score
・制作難易度
・予想視聴維持率

を付ける。

---

# 13. 企画スコア

100点満点。

Target Fit 20
Hook 20
Novelty 15
Information Value 15
Comment Potential 10
Visual Potential 10
Originality 10

70未満：

却下。

80以上：

候補。

90以上：

優先制作。

---

# 14. 台本テンプレート

YouTube Shorts。

最大60秒。

基本尺：

35〜55秒

を優先。

---

## 0〜3秒

強烈なフック。

禁止：

「こんにちは」
「今回は○○について紹介します」

使用候補：

「実は、これ知らないと損です。」

「30代の人ほど知らない。」

「これ、ほとんどの人が間違えています。」

「もし○○しているなら、今すぐやめてください。」

ただし、内容と一致すること。

---

## 3〜50秒

結論先出し。

短文。

テンポ重視。

1文を短く。

---

## 50〜60秒

オチ。

可能なら冒頭へ自然につながる。

---

# 15. 台本JSON

{
  "title": "",
  "duration": 45,
  "hook": "",
  "scenes": [
    {
      "start": 0,
      "end": 3,
      "visual": "",
      "narration": "",
      "subtitle": "",
      "sfx": ""
    }
  ],
  "ending": "",
  "description": "",
  "hashtags": [],
  "keywords": []
}

---

# 16. 動画仕様

必ず：

9:16
1080x1920
30fps
MP4
H.264
AAC

Shorts向け。

60秒以内。

---

# 17. 映像

以下を組み合わせる。

・AI生成映像
・AI生成画像
・オリジナル図解
・モーショングラフィックス
・フリー素材
・テキストアニメーション

第三者の動画を無断転載しない。

---

# 18. AI映像生成

VisualAgentが各シーンを解析し、

動画生成用プロンプトを作る。

例：

Scene 01

「30代日本人男性がスマートフォンを見て驚いている。現代的な室内。縦型動画。リアルな映像。強い表情。Shorts向け。冒頭3秒で視線を引く構図。」

---

# 19. VoiceAgent

日本語ナレーション。

条件：

・自然
・聞き取りやすい
・30代男性向け
・感情表現
・テンポ良好

冒頭は特に強く。

TTSプロバイダーは抽象化。

VoiceProvider interfaceを作る。

---

# 20. SubtitleAgent

ナレーションから字幕を自動生成。

条件：

・スマホで読める
・大きい
・短文
・重要単語を強調
・音声と同期
・YouTube UIと被らない

字幕データ：

start
end
text
emphasis

を保存。

---

# 21. BGM

動画ジャンルからAIが選択。

BGMはナレーションを邪魔しない音量。

著作権上安全に利用できる音源のみ使用。

---

# 22. 編集

FFmpegを中心に使用。

必要に応じてNode.jsからFFmpegを制御。

処理：

・映像合成
・音声合成
・字幕
・BGM
・効果音
・トランジション
・ズーム
・パン
・テキストアニメーション

---

# 23. QualityAgent

投稿前に自動検査。

チェック：

[ ] 60秒以内
[ ] 9:16
[ ] 1080x1920
[ ] 音声あり
[ ] 字幕あり
[ ] 字幕同期
[ ] 映像破綻
[ ] 黒画面
[ ] 音割れ
[ ] 誤字
[ ] 誤情報
[ ] タイトル整合性
[ ] 著作権リスク
[ ] 重複コンテンツ
[ ] 過剰な煽り
[ ] センシティブ内容

NGなら自動修正。

---

# 24. YouTube投稿

YouTube Data APIを利用。

ブラウザ自動操作ではなく、可能な限り公式APIを使用。

投稿情報：

・タイトル
・説明文
・タグ
・公開設定
・予約日時

を管理。

---

# 25. 初期安全モード

最初は、

AUTO_UPLOAD=false

にする。

つまり、

AI制作
↓
品質チェック
↓
管理画面
↓
人間確認
↓
投稿

とする。

---

# 26. FULL AUTO

管理画面から、

FULL AUTO

を有効化できるようにする。

FULL AUTO時：

トレンド調査
↓
企画
↓
台本
↓
動画
↓
品質検査
↓
投稿

まで自動。

ただし、

QualityAgentの最低スコアを設定。

例：

QUALITY_THRESHOLD=85

85点未満は投稿しない。

---

# 27. 投稿頻度

初期：

1日1本。

安定後：

1日2本まで。

AIが品質を維持できない場合は自動的に投稿頻度を下げる。

---

# 28. 投稿時間

初期テスト：

12:00
18:00
20:00
21:00
22:00

データを蓄積。

AnalyticsAgentが、

「このチャンネルでは何時が強いか」

を分析。

最終的に自動最適化。

---

# 29. Analytics

YouTube Analytics APIで取得可能な指標を保存。

・再生数
・高評価
・コメント
・共有
・平均視聴時間
・視聴維持率
・登録者増加
・インプレッション
・CTR等
・公開日時

取得できない指標は無理に作らない。

---

# 30. 動画ごとのAI評価

投稿後に、

HOOK
RETENTION
TOPIC
TITLE
ENDING
COMMENT
CONVERSION

を評価。

例：

HOOK_SCORE=92
TOPIC_SCORE=87
RETENTION_SCORE=73
ENDING_SCORE=81

そして改善案を生成。

---

# 31. チャンネル専用「勝ちパターンDB」

このシステムの最重要機能。

動画を投稿するたびに、

「このチャンネルでは何が伸びるのか」

をDBへ蓄積する。

例えば、

・40〜50秒が強い
・「実は○○」が強い
・仕事系が強い
・20時台が強い
・冒頭2秒以内に数字を出すと強い
・質問型はコメント率が高い

など。

---

# 32. StrategyAgent

毎日、過去データを分析。

以下を生成：

WINNING_PATTERNS
LOSING_PATTERNS
BEST_TOPICS
BEST_HOOKS
BEST_LENGTH
BEST_POST_TIME
BEST_ENDING
BEST_CTA

そして次のIdeaAgentへ渡す。

---

# 33. 自動PDCA

完全なループを作る。

DAY 1

市場調査
↓
動画制作
↓
投稿

DAY 2

分析
↓
改善

DAY 3

改善版制作
↓
投稿

これを繰り返す。

---

# 34. 管理画面

Next.js + Tailwindで作る。

---

## Dashboard

表示：

・今日の動画
・今日の再生数
・登録者増加
・平均再生数
・最高再生数
・Buzz Score
・Quality Score

---

## Trends

・急上昇テーマ
・Buzz Score
・関連キーワード
・分析済み動画

---

## Ideas

企画一覧。

各カード：

タイトル
ジャンル
Buzz Score
Originality Score
制作難易度

ボタン：

「制作」

---

## Production

制作進行状況。

TREND
IDEA
SCRIPT
VOICE
VISUAL
EDIT
QUALITY
UPLOAD

のステータス表示。

---

## Videos

・下書き
・レビュー
・予約
・投稿済み
・失敗

---

## Analytics

グラフ：

再生数
登録者
視聴維持率
高評価率
コメント率

---

## Strategy

AIが発見した、

「このチャンネルの勝ちパターン」

を表示。

---

# 35. データベース

Prismaを使用。

最低限：

Channel
Trend
SourceVideo
VideoAnalysis
Idea
Script
Scene
Asset
Voice
Video
Upload
Analytics
Strategy
Experiment
Job
ErrorLog

を作る。

---

# 36. ジョブシステム

Schedulerを作る。

例：

06:00
Trend収集

07:00
Viral分析

08:00
Idea生成

09:00
Script生成

10:00
Asset生成

11:00
Video編集

11:30
Quality Check

12:00
Upload

翌日
Analytics

---

# 37. ジョブの再実行

AI APIエラー等が発生しても全体停止しない。

retry_countを保存。

最大3回。

それでも失敗したら、

Job status = FAILED

としてログ保存。

---

# 38. API管理

.env

以下のようにする。

YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=

GEMINI_API_KEY=
GEMINI_MODEL=

VOICE_API_KEY=
VIDEO_API_KEY=

DATABASE_URL=

など。

実際に必要なサービスだけ使用する。

---

# 39. セキュリティ

絶対に、

・Googleパスワード
・APIキー
・OAuth token

をGitHubへアップロードしない。

.gitignore：

.env
*.key
*.pem
tokens/
credentials/

などを設定。

---

# 40. OAuth

初回起動時、

http://localhost:xxxx/auth/google

等からGoogle OAuthを開始。

ユーザーが、

kloversmovie@gmail.com

でログイン。

YouTube権限を許可。

成功したらtokenを暗号化して保存。

---

# 41. 初回セットアップウィザード

管理画面に、

「YouTube AI運用セットアップ」

を作る。

STEP 1
Google OAuth

STEP 2
YouTubeチャンネル確認

STEP 3
Gemini API

STEP 4
動画生成設定

STEP 5
音声設定

STEP 6
テスト動画

STEP 7
YouTube投稿テスト

STEP 8
AUTO MODE

---

# 42. テストモード

最初に必ず、

「テスト動画1本」

を作れるようにする。

ボタン：

GENERATE TEST VIDEO

押すと、

企画
↓
台本
↓
音声
↓
映像
↓
字幕
↓
編集
↓
Quality

まで実行。

---

# 43. 投稿テスト

最初は、

YouTube公開設定：

非公開

でアップロード。

正常にアップロードできることを確認。

その後、

限定公開

→

公開

へ切り替えられるようにする。

---

# 44. 自動運用設定

設定画面：

AUTO_MODE

OFF / SAFE / FULL

SAFE：

動画自動生成
↓
人間承認
↓
投稿

FULL：

動画自動生成
↓
品質チェック
↓
自動投稿

---

# 45. コンテンツ安全性

AIが以下を検査。

・虚偽情報
・誤情報
・危険な助言
・差別
・誹謗中傷
・著作権侵害
・なりすまし
・誤解を招くタイトル
・過剰な煽り

危険な動画は投稿しない。

---

# 46. 情報ソース

雑学・科学・お金など、

事実確認が重要なジャンルでは、

AIの記憶だけで断定しない。

可能なら信頼できる公開情報を複数確認。

事実確認できない内容は、

「諸説あります」

などの適切な表現を使用。

---

# 47. バズ動画分析について

分析対象の動画を、

そのまま再利用しない。

分析するのは、

・構成
・フック
・テンポ
・テーマ
・視聴心理

のみ。

出力動画は、

「別の企画」
「別の台本」
「別の映像」
「別の音声」

にする。

---

# 48. 重複検出

過去動画と比較。

比較対象：

・タイトル
・台本
・テーマ
・字幕
・構成

類似度が高すぎたら再生成。

---

# 49. ファイル構成

youtube-shorts-ai/

├── app/
│
├── src/
│   ├── agents/
│   │   ├── trend/
│   │   ├── viral/
│   │   ├── idea/
│   │   ├── script/
│   │   ├── visual/
│   │   ├── voice/
│   │   ├── editor/
│   │   ├── quality/
│   │   ├── upload/
│   │   ├── analytics/
│   │   └── strategy/
│   │
│   ├── youtube/
│   ├── gemini/
│   ├── video/
│   ├── database/
│   ├── scheduler/
│   └── utils/
│
├── prisma/
│
├── public/
│
├── storage/
│   ├── assets/
│   ├── audio/
│   ├── drafts/
│   ├── completed/
│   └── uploaded/
│
├── logs/
│
├── .env.example
├── .gitignore
├── package.json
└── README.md

---

# 50. 技術スタック

基本：

Next.js
TypeScript
Node.js
Tailwind CSS
Prisma
SQLite

将来PostgreSQLへ移行可能な設計。

動画：

FFmpeg

AI：

Gemini Flash

YouTube：

YouTube Data API
YouTube Analytics API

---

# 51. Claude Codeの作業ルール

ここが非常に重要。

あなたは途中で、

「次は何をしますか？」

と質問してはいけない。

仕様上合理的な判断ができる場合は自律的に進める。

エラーが出た場合：

調査
↓
原因特定
↓
修正
↓
再実行
↓
テスト

まで自分で行う。

---

# 52. ただしユーザー操作が必要な場合

以下だけはユーザーへ指示する。

・Google OAuth
・APIキー入力
・Google Cloud設定
・CAPTCHA
・電話番号認証
・外部サービスのログイン

この場合、

「何を開く」
「どこをクリックする」
「何を入力する」

を日本語で具体的に説明する。

---

# 53. 初回起動

最終的に、

npm install

または

pnpm install

後、

npm run dev

で管理画面を起動できるようにする。

本番運用：

npm run auto

または

pnpm auto

で自動運用を開始。

---

# 54. AUTOコマンド

npm run auto

実行時：

1. 設定確認
2. YouTube認証確認
3. API確認
4. トレンド収集
5. バズ分析
6. 戦略分析
7. 企画生成
8. 企画スコアリング
9. 台本生成
10. 映像生成
11. 音声生成
12. 字幕生成
13. FFmpeg編集
14. Quality Check
15. 重複チェック
16. 投稿
17. Analytics登録

まで実行。

---

# 55. AIの自己改善

動画投稿後、

AnalyticsAgent

が結果を分析。

StrategyAgent

が勝ちパターンを更新。

IdeaAgent

が次の企画に反映。

つまり、

動画1
↓
データ
↓
学習
↓
動画2
↓
データ
↓
学習
↓
動画3

と改善する。

---

# 56. 「バズを狙う」ための重要指標

AIは再生数だけを最大化しない。

以下を総合評価。

・初動再生
・視聴維持率
・平均視聴時間
・最後まで見た割合
・高評価率
・コメント率
・共有率
・チャンネル登録率

特に、

「再生数は多いが登録者が増えない動画」

と、

「再生数は普通だが登録者が大量に増える動画」

を区別する。

---

# 57. 動画の勝敗判定

投稿後、

24時間
48時間
72時間
7日

のタイミングで評価。

例えば、

S：
大成功

A：
成功

B：
平均

C：
弱い

D：
失敗

とする。

---

# 58. AIによる失敗分析

D判定の場合、

なぜ失敗したかを分析。

例：

「冒頭で結論が遅い」

「テーマが弱い」

「字幕が多すぎる」

「映像変化が少ない」

「タイトルと内容のギャップ」

など。

次回生成時に改善ルールとして使用。

---

# 59. 自動実験

AIが定期的に、

HOOK A
HOOK B

TITLE A
TITLE B

VIDEO LENGTH 40秒
VIDEO LENGTH 50秒

などを比較する。

ただし大量の重複投稿は行わない。

---

# 60. 管理画面から設定可能にするもの

・投稿頻度
・投稿時間
・AUTO_MODE
・Quality Threshold
・対象カテゴリ
・1日最大投稿数
・Geminiモデル
・音声モデル
・動画生成モデル
・BGM
・字幕スタイル

---

# 61. 日本語UI

管理画面は完全日本語。

例：

ダッシュボード
トレンド
企画
制作
動画
分析
戦略
設定
ログ

---

# 62. 通知

投稿成功・失敗時に通知できる設計。

NotificationProviderを作り、

将来、

Discord
Slack
Email

などを追加できるようにする。

---

# 63. 完成時のREADME

README.mdに初心者向けに、

1. 必要ソフト
2. Node.js確認
3. FFmpeg確認
4. Google Cloud設定
5. YouTube API設定
6. Gemini API設定
7. .env設定
8. OAuth認証
9. 初回テスト
10. 非公開投稿テスト
11. SAFE MODE
12. FULL AUTO
13. 停止方法
14. ログ確認
15. エラー対処

を日本語で書く。

---

# 64. 完成条件

「コードを書いた」では完成としない。

最低でも、

Google OAuth
↓
YouTubeチャンネル確認
↓
Gemini接続
↓
企画生成
↓
台本生成
↓
テスト動画生成
↓
字幕
↓
音声
↓
FFmpeg編集
↓
Quality Check
↓
YouTube非公開アップロード

まで実際にテストする。

---

# 65. 最終目標

最終的に、

PCを起動
↓
AI運用システム起動
↓
YouTube市場分析
↓
30代男性向け企画発見
↓
オリジナルShorts制作
↓
品質チェック
↓
YouTube投稿
↓
データ分析
↓
勝ちパターン更新
↓
次の動画生成

という自動ループを構築する。

---

# 66. 最後のClaude Codeへの命令

この仕様書を読み終えたら、まず現在のPC環境を調査してください。

その後、

「実装計画」

を内部で整理した上でSTEP 1から実装開始してください。

途中で不要な確認質問をせず、自律的に進めてください。

ただし、

・Google OAuth
・APIキー
・外部サービス認証

などユーザー本人の操作が必要なところに到達した場合だけ、具体的な操作手順を表示して待機してください。

それ以外は可能な限り自動で進めてください。

各工程が完了したら実際にテストしてください。

エラーがあれば自動修正してください。

最終的に、

「YouTube Shortsを1本生成し、Quality Checkを通し、非公開でYouTubeへアップロードできる状態」

まで完成させてください。

その後、

「SAFE MODE」

を完成させ、

最後に

「FULL AUTO」

を有効化できる状態にしてください。

このプロジェクトは単なる動画生成ツールではありません。

最終目標は、

**「30代男性向けYouTube Shortsチャンネルを、データ分析とAIによって継続的に改善しながら運営する自律型システム」**

です。