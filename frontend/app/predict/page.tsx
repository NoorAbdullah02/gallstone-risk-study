"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SliderField } from "@/components/ui/slider-field";
import { RiskGauge } from "@/components/risk-gauge";
import { getFeatures, predict, type FeatureSpec, type PredictionResponse } from "@/lib/api";

const CATEGORY_ORDER = ["Demographics", "Comorbidities", "Body Composition", "Laboratory"];

export default function PredictPage() {
  const [features, setFeatures] = useState<FeatureSpec[] | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFeatures()
      .then(({ features }) => {
        setFeatures(features);
        const defaults: Record<string, number> = {};
        for (const f of features) defaults[f.key] = Math.round(f.mean * 10) / 10;
        setValues(defaults);
      })
      .catch((e) => setError(e.message));
  }, []);

  const grouped = useMemo(() => {
    if (!features) return {};
    return features.reduce<Record<string, FeatureSpec[]>>((acc, f) => {
      (acc[f.category] ??= []).push(f);
      return acc;
    }, {});
  }, [features]);

  async function handlePredict() {
    setLoading(true);
    setError(null);
    try {
      const res = await predict(values);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    if (!features) return;
    const defaults: Record<string, number> = {};
    for (const f of features) defaults[f.key] = Math.round(f.mean * 10) / 10;
    setValues(defaults);
    setResult(null);
  }

  if (error && !features) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-14">
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent>
            <p className="font-medium">Could not load the form</p>
            <p className="text-sm text-muted-foreground">
              Start the backend: <code className="font-mono">uvicorn backend.main:app --reload --port 8000</code>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!features) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading form&hellip;
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold tracking-tight">Gallstone Risk Predictor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a patient&rsquo;s clinical and laboratory values to get the model&rsquo;s estimated
          probability of gallstone disease. Research prototype &mdash; not a diagnostic tool.
        </p>
      </motion.div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent>
            <Tabs defaultValue={CATEGORY_ORDER[0]}>
              <TabsList className="flex-wrap">
                {CATEGORY_ORDER.map((cat) => (
                  <TabsTrigger key={cat} value={cat}>
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
              {CATEGORY_ORDER.map((cat) => (
                <TabsContent key={cat} value={cat}>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {(grouped[cat] ?? []).map((spec) => (
                      <SliderField
                        key={spec.key}
                        spec={spec}
                        value={values[spec.key] ?? spec.mean}
                        onChange={(v) => setValues((prev) => ({ ...prev, [spec.key]: v }))}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-6 flex items-center gap-3">
              <Button onClick={handlePredict} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Predict risk
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
          </CardContent>
        </Card>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Prediction</CardTitle>
              <CardDescription>Logistic regression, clinical feature engineering</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <RiskGauge probability={result.probability} riskLevel={result.risk_level} />
                  </motion.div>
                ) : (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Fill in the values and click Predict.
                  </motion.p>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
