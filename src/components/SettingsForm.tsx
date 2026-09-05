"use client";

import { useState } from "react";
import type { Channel } from "@prisma/client";
import { Button } from "./ui";
import { updateChannelSettingsAction, testGeminiConnectionAction } from "@/app/actions";
import { GEMINI_MODEL_PRESETS, DEFAULT_GEMINI_MODEL, isPresetModel } from "@/gemini/models";

export default function SettingsForm({ channel }: { channel: Channel }) {
  const [autoMode, setAutoMode] = useState(channel.autoMode);
  const [qualityThreshold, setQualityThreshold] = useState(channel.qualityThreshold);
  const [maxPostsPerDay, setMaxPostsPerDay] = useState(channel.maxPostsPerDay);
  const initialModel = channel.geminiModel ?? DEFAULT_GEMINI_MODEL;
  const [geminiModel, setGeminiModel] = useState(initialModel);
  const [useCustomModel, setUseCustomModel] = useState(!isPresetModel(initialModel));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modelTestResult, setModelTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingModel, setTestingModel] = useState(false);

  return (
    <form
      className="space-y-5 max-w-lg"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaved(false);
        await updateChannelSettingsAction(channel.id, {
          autoMode,
          qualityThreshold,
          maxPostsPerDay,
          geminiModel: geminiModel || undefined,
        });
        setSaving(false);
        setSaved(true);
      }}
    >
      <div>
        <label className="block text-sm font-medium mb-2">AUTO_MODE</label>
        <div className="flex gap-2">
          {(["OFF", "SAFE", "FULL"] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => setAutoMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                autoMode === mode
                  ? "bg-sky-600 border-sky-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          OFF: 手動のみ / SAFE: AI制作→人間承認→投稿 / FULL: AI制作→品質チェック→自動投稿
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Quality Threshold(この点数未満は投稿しない)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={qualityThreshold}
          onChange={(e) => setQualityThreshold(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm w-32"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">1日最大投稿数</label>
        <input
          type="number"
          min={1}
          max={5}
          value={maxPostsPerDay}
          onChange={(e) => setMaxPostsPerDay(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm w-32"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Geminiモデル</label>
        <p className="text-xs text-slate-500 mb-2">
          企画・台本生成などに使うAIモデル。ランニングコストを抑えたい場合は「Flash-Lite」系がおすすめです。
        </p>

        {!useCustomModel ? (
          <select
            value={geminiModel}
            onChange={(e) => {
              if (e.target.value === "__custom__") {
                setUseCustomModel(true);
              } else {
                setGeminiModel(e.target.value);
              }
            }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm w-full max-w-md"
          >
            {GEMINI_MODEL_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
            <option value="__custom__">その他(直接入力)</option>
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="gemini-3.5-flash-lite"
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm w-64"
            />
            <button
              type="button"
              onClick={() => {
                setUseCustomModel(false);
                setGeminiModel(DEFAULT_GEMINI_MODEL);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              プリセットから選ぶ
            </button>
          </div>
        )}

        {!useCustomModel && (
          <p className="text-xs text-slate-500 mt-2">
            {GEMINI_MODEL_PRESETS.find((p) => p.id === geminiModel)?.description}
          </p>
        )}

        <div className="mt-2">
          <button
            type="button"
            disabled={testingModel}
            onClick={async () => {
              setTestingModel(true);
              setModelTestResult(null);
              await updateChannelSettingsAction(channel.id, { geminiModel });
              const result = await testGeminiConnectionAction();
              setModelTestResult(result);
              setTestingModel(false);
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50"
          >
            {testingModel ? "保存してテスト中…" : "このモデルを保存してテスト"}
          </button>
          {modelTestResult && (
            <p className={`text-xs mt-1 ${modelTestResult.ok ? "text-emerald-400" : "text-rose-400"}`}>
              {modelTestResult.ok ? `✓ 接続成功: ${modelTestResult.message}` : `✗ 失敗: ${modelTestResult.message}`}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </Button>
        {saved && <span className="text-xs text-emerald-400">保存しました</span>}
      </div>
    </form>
  );
}
