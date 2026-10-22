"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RocChart } from "@/components/charts/roc-chart";
import { PrChart } from "@/components/charts/pr-chart";
import { CalibrationChart } from "@/components/charts/calibration-chart";
import { ConfusionMatrix } from "@/components/charts/confusion-matrix";
import { LeaderboardChart } from "@/components/charts/leaderboard-chart";
import { FeatureImportanceChart } from "@/components/charts/feature-importance-chart";
import { getMetrics, type Metrics } from "@/lib/api";

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMetrics()
      .then(setMetrics)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-14">
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            <div>
              <p className="font-medium">Could not load results</p>
              <p className="text-sm text-muted-foreground">
                Start the backend: <code className="font-mono">uvicorn backend.main:app --reload --port 8000</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading results&hellip;
      </div>
    );
  }

  const { nested_cv: cv, curves, dataset, candidate_leaderboard, feature_importance, final_model } = metrics;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Nested Cross-Validation Results</h1>
            <p className="text-sm text-muted-foreground">
              {dataset.rows} patients &middot; {dataset.positives} gallstone-positive &middot;{" "}
              {cv.candidate_count} candidate configurations compared per outer fold
            </p>
          </div>
          <Badge variant="success">Best model: {String(final_model.configuration[0])}</Badge>
        </div>
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Mean outer-fold AUC" value={cv.mean_outer_auc.toFixed(3)} hint={`± ${cv.std_outer_auc.toFixed(3)}`} />
        <Metric label="Mean outer-fold accuracy" value={`${(cv.mean_outer_accuracy * 100).toFixed(1)}%`} />
        <Metric label="Sensitivity (recall)" value={cv.sensitivity.toFixed(3)} />
        <Metric label="Specificity" value={cv.specificity.toFixed(3)} />
        <Metric label="F1 score" value={cv.f1.toFixed(3)} />
        <Metric label="Matthews CC" value={cv.mcc.toFixed(3)} />
        <Metric label="Average precision" value={cv.average_precision.toFixed(3)} />
        <Metric label="Brier score" value={cv.brier_score.toFixed(3)} hint="lower is better" />
      </div>

      <Card className="mt-6 border-amber-500/30 bg-amber-500/5">
        <CardContent className="text-xs text-amber-700 dark:text-amber-400">
          {final_model.warning} Exploratory evaluation reusing a previously examined dataset &mdash;
          95% CI for pooled AUC (seed 42, conditional bootstrap): [
          {cv.bootstrap_ci_95.auc_95.map((v) => v.toFixed(3)).join(", ")}].
        </CardContent>
      </Card>

      <Tabs defaultValue="curves" className="mt-8">
        <TabsList>
          <TabsTrigger value="curves">Performance Curves</TabsTrigger>
          <TabsTrigger value="models">Model Comparison</TabsTrigger>
          <TabsTrigger value="features">Feature Importance</TabsTrigger>
        </TabsList>

        <TabsContent value="curves">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ROC Curve</CardTitle>
                <CardDescription>Nested OOF predictions vs. fixed LR baseline (seed 42)</CardDescription>
              </CardHeader>
              <CardContent>
                <RocChart nested={curves.roc_nested} baseline={curves.roc_baseline} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Precision&ndash;Recall Curve</CardTitle>
                <CardDescription>Average precision: {cv.average_precision.toFixed(3)}</CardDescription>
              </CardHeader>
              <CardContent>
                <PrChart data={curves.pr_nested} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Calibration</CardTitle>
                <CardDescription>Predicted probability vs. observed frequency, 7 quantile bins</CardDescription>
              </CardHeader>
              <CardContent>
                <CalibrationChart data={curves.calibration} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Confusion Matrix</CardTitle>
                <CardDescription>Threshold = 0.5, nested OOF (seed 42)</CardDescription>
              </CardHeader>
              <CardContent>
                <ConfusionMatrix matrix={curves.confusion_matrix} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Leaderboard</CardTitle>
              <CardDescription>
                Full-data 3-fold CV AUC per locked candidate (LR, SVM, Random Forest, Extra Trees, HistGradientBoosting)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardChart rows={candidate_leaderboard} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Importance</CardTitle>
              <CardDescription>
                Final deployed model ({String(final_model.configuration[0])}) &mdash; absolute coefficient magnitude
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feature_importance ? (
                <FeatureImportanceChart data={feature_importance} />
              ) : (
                <p className="text-sm text-muted-foreground">Not available for this model type.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
