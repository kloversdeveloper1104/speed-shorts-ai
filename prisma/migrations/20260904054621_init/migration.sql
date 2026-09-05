-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "youtubeChannelId" TEXT,
    "googleAccountEmail" TEXT NOT NULL DEFAULT 'kloversmovie@gmail.com',
    "title" TEXT,
    "description" TEXT,
    "subscriberCount" INTEGER DEFAULT 0,
    "autoMode" TEXT NOT NULL DEFAULT 'OFF',
    "qualityThreshold" INTEGER NOT NULL DEFAULT 85,
    "maxPostsPerDay" INTEGER NOT NULL DEFAULT 1,
    "postTimes" TEXT NOT NULL DEFAULT '["12:00","18:00","20:00","21:00","22:00"]',
    "targetCategories" TEXT NOT NULL DEFAULT '[]',
    "geminiModel" TEXT,
    "voiceProvider" TEXT NOT NULL DEFAULT 'edge-tts',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Trend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "category" TEXT,
    "score" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'youtube',
    "metadata" TEXT,
    "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SourceVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trendId" TEXT,
    "youtubeVideoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channelTitle" TEXT,
    "channelId" TEXT,
    "publishedAt" DATETIME,
    "viewCount" BIGINT DEFAULT 0,
    "likeCount" BIGINT DEFAULT 0,
    "commentCount" BIGINT DEFAULT 0,
    "subscriberCount" BIGINT DEFAULT 0,
    "durationSeconds" INTEGER,
    "url" TEXT NOT NULL,
    "buzzScore" REAL DEFAULT 0,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceVideo_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceVideoId" TEXT NOT NULL,
    "hook" TEXT,
    "topic" TEXT,
    "audience" TEXT,
    "duration" INTEGER,
    "structure" TEXT,
    "hookType" TEXT,
    "narrationStyle" TEXT,
    "subtitleStyle" TEXT,
    "sceneChangeRate" REAL,
    "emotionCurve" TEXT,
    "endingType" TEXT,
    "commentTrigger" TEXT,
    "retentionStrategy" TEXT,
    "whyItWorks" TEXT,
    "adaptationIdeas" TEXT,
    "originalityRisk" TEXT,
    "rawJson" TEXT,
    "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoAnalysis_sourceVideoId_fkey" FOREIGN KEY ("sourceVideoId") REFERENCES "SourceVideo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "genre" TEXT,
    "targetAudience" TEXT DEFAULT '30代男性',
    "hook" TEXT,
    "summary" TEXT,
    "buzzScore" REAL DEFAULT 0,
    "originalityScore" REAL DEFAULT 0,
    "productionDifficulty" TEXT,
    "expectedRetention" REAL,
    "scoreTotal" REAL DEFAULT 0,
    "scoreBreakdown" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceAnalysisIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ideaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 45,
    "hook" TEXT NOT NULL,
    "ending" TEXT,
    "description" TEXT,
    "hashtags" TEXT,
    "keywords" TEXT,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Script_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "startSec" REAL NOT NULL,
    "endSec" REAL NOT NULL,
    "visual" TEXT,
    "narration" TEXT,
    "subtitle" TEXT,
    "sfx" TEXT,
    "visualPrompt" TEXT,
    CONSTRAINT "Scene_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sceneId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "filePath" TEXT,
    "prompt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Asset_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Voice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "filePath" TEXT,
    "durationSec" REAL,
    "subtitlesJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Voice_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "filePath" TEXT,
    "thumbnailPath" TEXT,
    "durationSec" REAL,
    "width" INTEGER NOT NULL DEFAULT 1080,
    "height" INTEGER NOT NULL DEFAULT 1920,
    "fps" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "qualityScore" REAL,
    "qualityChecklist" TEXT,
    "qualityIssues" TEXT,
    "duplicateOf" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Video_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Video_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "youtubeVideoId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT,
    "privacyStatus" TEXT NOT NULL DEFAULT 'private',
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "measuredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowLabel" TEXT,
    "views" BIGINT DEFAULT 0,
    "likes" BIGINT DEFAULT 0,
    "comments" BIGINT DEFAULT 0,
    "shares" BIGINT DEFAULT 0,
    "averageViewDuration" REAL,
    "averageViewPercentage" REAL,
    "subscribersGained" INTEGER DEFAULT 0,
    "impressions" BIGINT,
    "ctr" REAL,
    "hookScore" REAL,
    "retentionScore" REAL,
    "topicScore" REAL,
    "titleScore" REAL,
    "endingScore" REAL,
    "commentScore" REAL,
    "conversionScore" REAL,
    "grade" TEXT,
    "aiEvaluationJson" TEXT,
    "improvementNotes" TEXT,
    CONSTRAINT "Analytics_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "winningPatterns" TEXT,
    "losingPatterns" TEXT,
    "bestTopics" TEXT,
    "bestHooks" TEXT,
    "bestLength" TEXT,
    "bestPostTime" TEXT,
    "bestEnding" TEXT,
    "bestCta" TEXT,
    "rawAnalysis" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Strategy_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT,
    "type" TEXT NOT NULL,
    "variantA" TEXT NOT NULL,
    "variantB" TEXT NOT NULL,
    "winner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Experiment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" TEXT,
    "result" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "scheduledAt" DATETIME,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Channel_youtubeChannelId_key" ON "Channel"("youtubeChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceVideo_youtubeVideoId_key" ON "SourceVideo"("youtubeVideoId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAnalysis_sourceVideoId_key" ON "VideoAnalysis"("sourceVideoId");

-- CreateIndex
CREATE UNIQUE INDEX "Script_ideaId_key" ON "Script"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_scriptId_key" ON "Video"("scriptId");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_videoId_key" ON "Upload"("videoId");
