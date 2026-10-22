"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function FeatureImportanceChart({ data }: { data: [string, number][] }) {
  const rows = data.slice(0, 12).map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
          formatter={(v) => (typeof v === "number" ? v.toFixed(4) : v)}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="var(--accent)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
