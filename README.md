# Gallstone Risk Study

**Predicting Gallstone Disease from Clinical and Laboratory Data: A Leakage-Aware Machine Learning Evaluation**

Accepted as a Poster Presentation at the 2nd International Student Research Conference (ISRC) 2026
(Dhaka University Research Society), Submission ID `ISRC-2026-1506`.

An exploratory, leakage-aware machine learning study on the UCI Gallstone dataset (319 patients, 38
clinical/laboratory features), with a full-stack demo application: a Python/FastAPI backend serving
the trained model and study results, and a Next.js dashboard + interactive risk predictor.

## Project layout

```
Gallstone_Improvement_Exploratory_Offline_Kaggle.ipynb   Original exploratory notebook (runs end-to-end, zero errors)
gallstone_upgrade_exploratory/                            Notebook's own output artifacts (figures, CSVs, zip)
data/gallstone_dataset.csv                                Verified dataset (SHA256-checked, extracted from the notebook)
model/
  transformers.py                                         Fold-local feature engineering & clipping transformers
  train.py                                                 Leakage-safe nested-CV training script (expanded candidate menu)
  artifacts/                                                final_model.joblib, metrics.json, feature_schema.json
backend/
  main.py                                                  FastAPI app: /api/features, /api/metrics, /api/predict
  requirements.txt
frontend/                                                  Next.js 16 + TypeScript + Tailwind v4 app
  app/                                                      Overview, Results dashboard, Risk Predictor pages
  components/                                               UI primitives, charts (recharts), risk gauge
```

## Methodology

All feature engineering, outlier clipping, imputation, scaling and feature selection are fit **inside
each training fold only** &mdash; never on held-out data. Two independent stratified 5-fold outer
partitions (seeds 42 and 123) evaluate 18 locked candidate configurations (regularized logistic
regression, RBF-kernel SVM, Random Forest, Extra Trees, HistGradientBoosting), selected honestly by
3-fold inner cross-validation ROC-AUC within each outer training fold.

Across all 10 outer folds, **logistic regression with clinical feature engineering was selected every
time** over the tree-ensemble candidates &mdash; a genuine result of the honest nested-CV comparison on
this dataset size (n=319), not a default choice.

Nested outer-fold AUC: **~0.89** &middot; accuracy: **~82%**. See `model/artifacts/metrics.json` and the
notebook's `README_RESULTS_EXPLORATORY.md` for full caveats: this reuses a previously examined dataset,
so results are exploratory/development evidence, not an independent confirmatory test.

## Running it

### 1. Python environment

```bash
pip install -r requirements.txt
```

### 2. Train the model (regenerates `model/artifacts/`)

```bash
python -m model.train
```

### 3. Backend API

```bash
uvicorn backend.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`. The frontend reads `NEXT_PUBLIC_API_BASE` (see `frontend/.env.example`)
to reach the backend, default `http://127.0.0.1:8000`.

## Deploying (Render)

One unified service: the `Dockerfile` builds the Next.js app as a static export
(`output: "export"`) and the FastAPI backend serves both the API (`/api/*`) and the built
frontend from the same origin, so there's only one Render URL for the whole app.

In the Render dashboard: **New &rarr; Blueprint**, connect this repo (it will pick up
`render.yaml`), and deploy `gallstone-risk-study`. No separate frontend service, no
`NEXT_PUBLIC_API_BASE` to wire up &mdash; `frontend/lib/api.ts` defaults to same-origin
requests when that env var isn't set.

## Disclaimer

Exploratory research prototype. Not validated for clinical deployment or diagnostic use.
