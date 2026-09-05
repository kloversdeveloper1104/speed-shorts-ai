"use client";

import { useTransition, useState } from "react";
import { Button } from "./ui";

export default function RunButton({
  action,
  label,
  pendingLabel,
  variant = "primary",
  onDone,
}: {
  action: () => Promise<unknown>;
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  onDone?: (result: unknown) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant={variant}
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const result = await action();
              onDone?.(result);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          });
        }}
      >
        {isPending ? (pendingLabel ?? "実行中…") : label}
      </Button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}
