"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  Low: "#10b981",
  Moderate: "#f59e0b",
  High: "#f43f5e",
};

export function RiskGauge({ probability, riskLevel }: { probability: number; riskLevel: string }) {
  const pct = Math.round(probability * 100);
  const radius = 72;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference * (1 - probability);
  const color = COLORS[riskLevel] ?? "var(--primary)";

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="120" viewBox="0 0 200 120">
        <path
          d={`M 20 100 A ${radius} ${radius} 0 0 1 180 100`}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={16}
          strokeLinecap="round"
        />
        <motion.path
          d={`M 20 100 A ${radius} ${radius} 0 0 1 180 100`}
          fill="none"
          stroke={color}
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <motion.div
        key={pct}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="-mt-6 text-center"
      >
        <p className="text-4xl font-semibold tabular-nums" style={{ color }}>
          {pct}%
        </p>
        <p className={cn("mt-1 text-sm font-medium")} style={{ color }}>
          {riskLevel} risk
        </p>
      </motion.div>
    </div>
  );
}
