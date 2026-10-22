"use client";

import { cn } from "@/lib/utils";
import type { FeatureSpec } from "@/lib/api";

interface Props {
  spec: FeatureSpec;
  value: number;
  onChange: (v: number) => void;
}

export function SliderField({ spec, value, onChange }: Props) {
  if (spec.type === "binary") {
    return (
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm text-foreground/80">{spec.label}</label>
        <button
          type="button"
          onClick={() => onChange(value >= 0.5 ? 0 : 1)}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            value >= 0.5 ? "bg-primary" : "bg-muted"
          )}
          aria-pressed={value >= 0.5}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              value >= 0.5 && "translate-x-5"
            )}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm text-foreground/80">{spec.label}</label>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground/70">
          {Number.isInteger(spec.step) ? value.toFixed(0) : value.toFixed(1)}
        </span>
      </div>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--color-primary)]"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{spec.min}</span>
        <span>{spec.max}</span>
      </div>
    </div>
  );
}
