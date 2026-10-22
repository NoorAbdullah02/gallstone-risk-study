"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CurvePoint } from "@/lib/api";

export function PrChart({ data }: { data: CurvePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="prFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="recall"
          type="number"
          domain={[0, 1]}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          label={{ value: "Recall", position: "insideBottom", offset: -4, fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          label={{ value: "Precision", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
          formatter={(v) => (typeof v === "number" ? v.toFixed(3) : v)}
        />
        <Area type="monotone" dataKey="precision" stroke="var(--primary)" strokeWidth={2.5} fill="url(#prFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
