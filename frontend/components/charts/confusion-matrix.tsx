"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";

export function ConfusionMatrix({ matrix }: { matrix: number[][] }) {
  const [[tn, fp], [fn, tp]] = matrix;
  const max = Math.max(tn, fp, fn, tp);
  const cells = [
    { label: "True Negative", value: tn, row: 0, col: 0 },
    { label: "False Positive", value: fp, row: 0, col: 1 },
    { label: "False Negative", value: fn, row: 1, col: 0 },
    { label: "True Positive", value: tp, row: 1, col: 1 },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-xs">
        <div />
        <div className="text-center text-muted-foreground">Pred. No Gallstone</div>
        <div className="text-center text-muted-foreground">Pred. Gallstone</div>
        {["Actual: No Gallstone", "Actual: Gallstone"].map((rowLabel, r) => (
          <Fragment key={`row-${r}`}>
            <div className="flex items-center text-muted-foreground">{rowLabel}</div>
            {cells
              .filter((c) => c.row === r)
              .map((c) => (
                <div
                  key={c.label}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-xl border border-border text-center",
                    c.row === c.col ? "bg-primary/15" : "bg-rose-500/10"
                  )}
                  style={{ opacity: 0.45 + 0.55 * (c.value / max) }}
                >
                  <span className="text-xl font-semibold tabular-nums">{c.value}</span>
                  <span className="px-1 text-[10px] text-muted-foreground">{c.label}</span>
                </div>
              ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
