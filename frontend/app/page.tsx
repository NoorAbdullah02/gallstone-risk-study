"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Dna, FlaskConical, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMetrics, type Metrics } from "@/lib/api";

function StatCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card>
        <CardContent className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Home() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getMetrics().then(setMetrics).catch(() => setError(true));
  }, []);

  const auc = metrics ? metrics.nested_cv.mean_outer_auc.toFixed(3) : "—";
  const acc = metrics ? `${(metrics.nested_cv.mean_outer_accuracy * 100).toFixed(1)}%` : "—";
  const rows = metrics ? metrics.dataset.rows.toString() : "—";
  const candidates = metrics ? metrics.nested_cv.candidate_count.toString() : "—";

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hero-glow"
      >
        <Badge variant="default" className="mb-4">
          <FlaskConical className="h-3 w-3" /> ISRC 2026 &middot; Poster Presentation
        </Badge>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Predicting <span className="text-gradient">Gallstone Disease</span> from Clinical and
          Laboratory Data
        </h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          A leakage-aware machine learning evaluation: fold-local feature engineering,
          nested cross-validation across linear, kernel and tree-ensemble candidates, and
          honest, exploratory reporting &mdash; no inflated claims.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/dashboard">
              View Results <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/predict">Try the Risk Predictor</Link>
          </Button>
        </div>
      </motion.div>

      {error && (
        <p className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Backend API not reachable at the configured address. Start it with{" "}
          <code className="font-mono">uvicorn backend.main:app --reload --port 8000</code> from
          the project root.
        </p>
      )}

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={TrendingUp} label="Nested outer-fold AUC" value={auc} delay={0.05} />
        <StatCard icon={ShieldCheck} label="Nested accuracy" value={acc} delay={0.1} />
        <StatCard icon={Dna} label="Patient records" value={rows} delay={0.15} />
        <StatCard icon={FlaskConical} label="Candidate models compared" value={candidates} delay={0.2} />
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Leakage-safe pipeline",
            body: "Feature engineering, clipping, imputation, scaling and feature selection are fit inside each training fold only — never on held-out data.",
          },
          {
            title: "Nested cross-validation",
            body: "Two independent 5-fold outer partitions (seeds 42 & 123) with 3-fold inner model selection across 18 candidate configurations.",
          },
          {
            title: "Honest reporting",
            body: "Conditional bootstrap intervals, a fixed-baseline comparison, and explicit caveats about dataset reuse — no 95% claims.",
          },
        ].map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.05, duration: 0.4 }}
          >
            <Card className="h-full">
              <CardContent>
                <h3 className="text-sm font-semibold">{c.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
