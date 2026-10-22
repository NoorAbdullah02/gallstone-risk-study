// Defaults to "" (same-origin) for the unified single-service deploy, where
// the backend also serves this static export. frontend/.env.local overrides
// this to http://127.0.0.1:8000 for local dev when running the two servers
// separately; that file is gitignored and absent from the production build.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export type FeatureType = "binary" | "ordinal" | "continuous";

export interface FeatureSpec {
  key: string;
  label: string;
  category: string;
  min: number;
  max: number;
  mean: number;
  step: number;
  type: FeatureType;
}

export interface FeaturesResponse {
  features: FeatureSpec[];
  order: string[];
}

export interface CurvePoint {
  fpr?: number;
  tpr?: number;
  recall?: number;
  precision?: number;
  predicted?: number;
  observed?: number;
}

export interface FoldResult {
  seed: number;
  outer_fold: number;
  selected_family: string;
  selected: string;
  inner_selected_auc: number;
  heldout_auc: number;
  heldout_auc_lr_baseline: number;
  heldout_accuracy_05: number;
  heldout_accuracy_training_threshold: number;
  train_selected_threshold: number;
  heldout_lr_accuracy_05: number;
}

export interface CandidateLeaderboardRow {
  family: string;
  config: string;
  full_data_cv_auc: number;
}

export interface FamilyLeaderboardRow {
  selected_family: string;
  mean: number;
  std: number;
  count: number;
}

export interface Metrics {
  dataset: {
    rows: number;
    positives: number;
    negatives: number;
    features: string[];
  };
  nested_cv: {
    outer_partitions: number[];
    outer_folds_per_partition: number;
    inner_folds: number;
    candidate_count: number;
    mean_outer_auc: number;
    std_outer_auc: number;
    mean_outer_accuracy: number;
    mean_baseline_auc: number;
    pooled_auc_seed42: number;
    pooled_accuracy_seed42: number;
    f1: number;
    mcc: number;
    sensitivity: number;
    specificity: number;
    balanced_accuracy: number;
    precision: number;
    average_precision: number;
    brier_score: number;
    bootstrap_ci_95: { auc_95: number[]; accuracy_95: number[] };
  };
  family_leaderboard: FamilyLeaderboardRow[];
  candidate_leaderboard: CandidateLeaderboardRow[];
  final_model: {
    configuration: (string | number | boolean)[];
    inner_cv_auc_training_only: number;
    warning: string;
  };
  curves: {
    roc_nested: CurvePoint[];
    roc_baseline: CurvePoint[];
    pr_nested: CurvePoint[];
    calibration: CurvePoint[];
    confusion_matrix: number[][];
  };
  feature_importance: [string, number][] | null;
  fold_results: FoldResult[];
}

export interface PredictionResponse {
  probability: number;
  risk_level: "Low" | "Moderate" | "High";
  predicted_class: number;
  decision_threshold: number;
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export function getFeatures() {
  return getJSON<FeaturesResponse>("/api/features");
}

export function getMetrics() {
  return getJSON<Metrics>("/api/metrics");
}

export async function predict(
  values: Record<string, number>
): Promise<PredictionResponse> {
  const res = await fetch(`${API_BASE}/api/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Prediction failed: ${detail}`);
  }
  return res.json();
}
