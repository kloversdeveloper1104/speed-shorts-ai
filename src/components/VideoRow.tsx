"use client";

import { useState } from "react";
import type { Video, Script, Upload } from "@prisma/client";
import { Badge, statusColor } from "./ui";
import RunButton from "./RunButton";
import { approveAndUploadAction } from "@/app/actions";

type VideoWithRelations = Video & { script: Script; upload: Upload | null };

export default function VideoRow({ video }: { video: VideoWithRelations }) {
  const [privacy, setPrivacy] = useState<"private" | "unlisted" | "public">("private");
  const [status, setStatus] = useState(video.status);

  type Issue = { severity: "critical" | "minor"; description: string };
  const rawIssues: unknown[] = video.qualityIssues ? JSON.parse(video.qualityIssues) : [];
  const issues: Issue[] = rawIssues.map((iss) =>
    typeof iss === "string" ? { severity: "critical", description: iss } : (iss as Issue)
  );

  return (
    <div className="border-b border-slate-800 pb-3">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate flex-1">{video.script.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          {video.qualityScore != null && <span className="text-slate-400 text-xs">Q:{video.qualityScore}</span>}
          <Badge color={statusColor(status)}>{status}</Badge>
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {video.durationSec ? `${Math.round(video.durationSec)}秒` : ""} / {video.filePath ?? "ファイル未生成"}
      </div>
      {issues.length > 0 && (
        <ul className="text-xs mt-1 list-disc list-inside">
          {issues.slice(0, 4).map((iss, i) => (
            <li key={i} className={iss.severity === "critical" ? "text-rose-400" : "text-amber-400/80"}>
              {iss.severity === "minor" ? "(軽微) " : ""}
              {iss.description}
            </li>
          ))}
        </ul>
      )}
      {video.upload?.youtubeVideoId && (
        <div className="text-xs text-sky-400 mt-1">
          YouTube: https://youtube.com/shorts/{video.upload.youtubeVideoId}
        </div>
      )}
      {status === "REVIEW" && (
        <div className="flex items-center gap-2 mt-2">
          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as typeof privacy)}
            className="bg-slate-800 text-xs rounded px-2 py-1.5 border border-slate-700"
          >
            <option value="private">非公開</option>
            <option value="unlisted">限定公開</option>
            <option value="public">公開</option>
          </select>
          <RunButton
            action={async () => {
              const result = await approveAndUploadAction(video.id, privacy);
              if (result.success) setStatus("UPLOADED");
              return result;
            }}
            label="承認して投稿"
            pendingLabel="投稿中…"
          />
        </div>
      )}
    </div>
  );
}
