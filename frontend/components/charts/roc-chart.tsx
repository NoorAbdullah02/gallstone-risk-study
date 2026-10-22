"use client";

import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { CurvePoint } from "@/lib/api";

export function RocChart({ nested, baseline }: { nested: CurvePoint[]; baseline: CurvePoint[] }) {
  const data = nested.map((p, i) => ({
    fpr: p.fpr,
    nested: p.tpr,
    baseline: baseline[i]?.tpr,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="fpr"
          type="number"
          domain={[0, 1]}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          label={{ value: "False positive rate", position: "insideBottom", offset: -4, fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          label={{ value: "True positive rate", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
          formatter={(v) => (typeof v === "number" ? v.toFixed(3) : v)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="nested"
          name="Nested selection"
          stroke="var(--primary)"
          strokeWidth={2.5}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="baseline"
          name="Fixed LR baseline"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
        />
        <ReferenceLine
          segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
          stroke="var(--muted-foreground)"
          strokeDasharray="2 2"
          ifOverflow="extendDomain"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
