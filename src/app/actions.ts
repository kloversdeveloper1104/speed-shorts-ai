"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/database/client";
import { collectTrends, collectTrendingChart } from "@/agents/trend";
import { analyzeUnanalyzedVideos } from "@/agents/viral";
import { generateDailyIdeas } from "@/agents/idea";
import { generateScript } from "@/agents/script";
import { designAllScenes } from "@/agents/visual";
import { editVideoFromScript } from "@/agents/editor";
import { runQualityCheck } from "@/agents/quality";
import { uploadVideoToYoutube } from "@/agents/upload";
import { updateStrategy } from "@/agents/strategy";
import { generateTestVideo } from "@/scheduler/pipeline";
import { testGeminiConnection } from "@/gemini/client";

export async function runCollectTrendsAction() {
  const [keywordResults, chartResult] = await Promise.all([collectTrends(), collectTrendingChart()]);
  revalidatePath("/trends");
  return chartResult ? [...keywordResults, chartResult] : keywordResults;
}

export async function runViralAnalysisAction() {
  const result = await analyzeUnanalyzedVideos(10);
  revalidatePath("/trends");
  return result;
}

export async function runGenerateIdeasAction() {
  const result = await generateDailyIdeas(10);
  revalidatePath("/ideas");
  return result;
}

export async function produceIdeaAction(ideaId: string) {
  const idea = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId } });
  const script = await generateScript(idea);
  if (!script) return { success: false };

  await designAllScenes(script.scenes);
  const scriptWithScenes = await prisma.script.findUniqueOrThrow({
    where: { id: script.id },
    include: { scenes: true },
  });

  const edit = await editVideoFromScript(scriptWithScenes);
  if (!edit) return { success: false };

  const video = await prisma.video.findUniqueOrThrow({ where: { id: edit.videoId } });
  await runQualityCheck(video, scriptWithScenes);

  revalidatePath("/ideas");
  revalidatePath("/production");
  revalidatePath("/videos");
  return { success: true, videoId: video.id };
}

export async function generateTestVideoAction() {
  const result = await generateTestVideo();
  revalidatePath("/videos");
  revalidatePath("/production");
  return result;
}

export async function approveAndUploadAction(
  videoId: string,
  privacyStatus: "private" | "unlisted" | "public"
) {
  const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId }, include: { script: true } });
  const result = await uploadVideoToYoutube(video, video.script, { privacyStatus });
  revalidatePath("/videos");
  return result;
}

export async function updateStrategyAction(channelId: string) {
  const result = await updateStrategy(channelId);
  revalidatePath("/strategy");
  return result;
}

export async function testGeminiConnectionAction() {
  return testGeminiConnection();
}

export async function updateChannelSettingsAction(channelId: string, data: {
  autoMode?: string;
  qualityThreshold?: number;
  maxPostsPerDay?: number;
  geminiModel?: string;
  voiceProvider?: string;
}) {
  await prisma.channel.update({ where: { id: channelId }, data });
  revalidatePath("/settings");
}
