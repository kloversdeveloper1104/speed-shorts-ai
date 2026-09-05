"use client";

import { useState } from "react";
import type { Idea } from "@prisma/client";
import { Card, Badge, statusColor } from "./ui";
import RunButton from "./RunButton";
import { produceIdeaAction } from "@/app/actions";

function scoreColor(score: number | null): "green" | "blue" | "yellow" | "red" | "gray" {
  if (score == null) return "gray";
  if (score >= 90) return "green";
  if (score >= 80) return "blue";
  if (score >= 70) return "yellow";
  return "red";
}

export default function IdeaCard({ idea }: { idea: Idea }) {
  const [produced, setProduced] = useState(idea.status === "PRODUCED");

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm">{idea.title}</h3>
        <Badge color={scoreColor(idea.scoreTotal)}>{idea.scoreTotal}点</Badge>
      </div>
      <div className="text-xs text-slate-400 mt-1">
        {idea.genre} / {idea.targetAudience} / 難易度:{idea.productionDifficulty}
      </div>
      <p className="text-xs text-slate-500 mt-2 line-clamp-3">{idea.summary}</p>
      <div className="flex items-center justify-between mt-3">
        <Badge color={statusColor(idea.status)}>{idea.status}</Badge>
        {!produced && idea.status !== "REJECTED" && (
          <RunButton
            action={async () => {
              const result = await produceIdeaAction(idea.id);
              if (result.success) setProduced(true);
              return result;
            }}
            label="制作"
            pendingLabel="制作中…"
          />
        )}
      </div>
    </Card>
  );
}
