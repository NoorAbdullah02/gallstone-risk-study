"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CandidateLeaderboardRow } from "@/lib/api";

const FAMILY_COLORS: Record<string, string> = {
  LR: "var(--primary)",
  SVM: "var(--accent)",
  RF: "#f59e0b",
  ET: "#ec4899",
  HGB: "#64748b",
};

export function LeaderboardChart({ rows }: { rows: CandidateLeaderboardRow[] }) {
  const top = rows.slice(0, 10).map((r) => ({
    name: r.config.replace(/[()']/g, "").replace(/, /g, " / "),
    auc: r.full_data_cv_auc,
    family: r.family,
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <XAxis type="number" domain={[0.7, 0.95]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <YAxis
          type="category"
          dataKey="name"
          width={170}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
          formatter={(v) => (typeof v === "number" ? v.toFixed(4) : v)}
        />
        <Bar dataKey="auc" radius={[0, 6, 6, 0]}>
          {top.map((row, i) => (
            <Cell key={i} fill={FAMILY_COLORS[row.family] ?? "var(--muted-foreground)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
