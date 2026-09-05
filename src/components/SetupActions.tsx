"use client";

import { useState } from "react";
import RunButton from "./RunButton";
import { testGeminiConnectionAction, generateTestVideoAction } from "@/app/actions";

export function GeminiTestButton() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div>
      <RunButton
        action={async () => {
          const r = await testGeminiConnectionAction();
          setResult(r);
          return r;
        }}
        label="Gemini接続テスト"
        pendingLabel="接続確認中…"
      />
      {result && (
        <p className={`text-sm mt-2 ${result.ok ? "text-emerald-400" : "text-rose-400"}`}>
          {result.ok ? `✓ 接続成功: ${result.message}` : `✗ 失敗: ${result.message}`}
        </p>
      )}
    </div>
  );
}

export function GenerateTestVideoButton({ disabled }: { disabled?: boolean }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof generateTestVideoAction>> | null>(null);

  return (
    <div>
      <RunButton
        action={async () => {
          const r = await generateTestVideoAction();
          setResult(r);
          return r;
        }}
        label="GENERATE TEST VIDEO"
        pendingLabel="生成中…(数分かかる場合があります)"
      />
      {result && (
        <div className="mt-3 text-sm">
          {result.passed ? (
            <p className="text-emerald-400">
              ✓ テスト動画の生成に成功しました(Quality Score: {result.qualityScore}点)。「動画」ページで確認できます。
            </p>
          ) : (
            <p className="text-rose-400">
              ✗ 失敗(段階: {result.stage}){result.error ? `: ${result.error}` : ""}
            </p>
          )}
        </div>
      )}
      {disabled && <p className="text-xs text-amber-400 mt-2">先にSTEP 3のGemini APIキーを設定してください。</p>}
    </div>
  );
}
