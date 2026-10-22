"use client";

import {
  CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import type { CurvePoint } from "@/lib/api";

export function CalibrationChart({ data }: { data: CurvePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="predicted"
          type="number"
          domain={[0, 1]}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          label={{ value: "Mean predicted probability", position: "insideBottom", offset: -4, fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          dataKey="observed"
          type="number"
          domain={[0, 1]}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          label={{ value: "Observed event proportion", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
          formatter={(v) => (typeof v === "number" ? v.toFixed(3) : v)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="var(--muted-foreground)" strokeDasharray="2 2" />
        <Scatter name="Nested OOF (seed 42)" data={data} fill="var(--primary)" line={{ stroke: "var(--primary)", strokeWidth: 2 }} shape="circle" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
