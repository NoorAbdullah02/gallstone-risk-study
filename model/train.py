"""
Gallstone risk model training: leakage-safe nested cross-validation with an
expanded candidate menu (linear, kernel, and tree-ensemble models), selecting
the best-performing configuration honestly (inner CV never sees outer test
folds), then fitting one final full-data model for the application backend.

Methodology mirrors Gallstone_Improvement_Exploratory_Offline_Kaggle.ipynb:
all feature engineering, clipping, imputation, scaling and feature selection
happen inside each training fold only.
"""
import json
import time
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.ensemble import ExtraTreesClassifier, HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.feature_selection import SelectKBest, VarianceThreshold, f_classif
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, average_precision_score, balanced_accuracy_score,
    brier_score_loss, confusion_matrix, f1_score, matthews_corrcoef,
    precision_recall_curve, precision_score, recall_score, roc_auc_score, roc_curve,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler
from sklearn.svm import SVC

from model.transformers import ClinicalFeatures, ClipByTrainingQuantiles

warnings.filterwarnings("ignore", category=FutureWarning)

ROOT = Path(__file__).resolve().parent.parent
DATA_CSV = ROOT / "data" / "gallstone_dataset.csv"
ARTIFACTS = ROOT / "model" / "artifacts"
ARTIFACTS.mkdir(parents=True, exist_ok=True)
SEED = 42


def make_classifier(family, param):
    if family == "LR":
        return LogisticRegression(C=param, solver="lbfgs", max_iter=3000)
    if family == "SVM":
        return SVC(C=param, kernel="rbf", probability=True, random_state=SEED)
    if family == "RF":
        return RandomForestClassifier(
            n_estimators=param, max_depth=None, min_samples_leaf=2,
            random_state=SEED, n_jobs=1,
        )
    if family == "ET":
        return ExtraTreesClassifier(
            n_estimators=param, max_depth=None, min_samples_leaf=2,
            random_state=SEED, n_jobs=1,
        )
    if family == "HGB":
        return HistGradientBoostingClassifier(
            learning_rate=param, max_iter=150, max_depth=3, random_state=SEED,
        )
    raise ValueError(family)


def model(family, fe, k, param):
    clf = make_classifier(family, param)
    steps = [
        ("fe", ClinicalFeatures(enabled=fe)),
        ("impute", SimpleImputer(strategy="median")),
        ("clip", ClipByTrainingQuantiles()),
        ("variance", VarianceThreshold(threshold=0.0)),
    ]
    if k != "all":
        steps.append(("select", SelectKBest(score_func=f_classif, k=k)))
    steps.extend([("scale", RobustScaler()), ("clf", clf)])
    return Pipeline(steps)


# Locked candidate menu: only ever compared within each outer-training fold.
candidates = [
    ("LR", False, "all", 0.1), ("LR", False, "all", 1),
    ("LR", True, "all", 0.1), ("LR", True, "all", 1), ("LR", True, "all", 10),
    ("LR", True, 22, 0.1), ("LR", True, 22, 1), ("LR", True, 22, 10), ("LR", True, 12, 1),
    ("SVM", True, "all", 0.1), ("SVM", True, "all", 1), ("SVM", True, 22, 1),
    ("RF", True, "all", 200), ("RF", True, 22, 300),
    ("ET", True, "all", 300),
    ("HGB", True, "all", 0.1), ("HGB", True, "all", 0.05), ("HGB", True, 22, 0.1),
]


def cutoff_train(ytrue, probs):
    vals = np.unique(np.r_[0, 0.5, 1, probs])
    mids = (vals[:-1] + vals[1:]) / 2
    accuracy = np.array([np.mean((probs >= t) == ytrue) for t in mids])
    mx = np.max(accuracy)
    return float(mids[np.flatnonzero(accuracy == mx)[np.argmin(abs(mids[accuracy == mx] - 0.5))]])


def load_data():
    df = pd.read_csv(DATA_CSV)
    assert df.shape == (319, 39), f"Unexpected dataset shape: {df.shape}"
    y = (df.pop("Gallstone").to_numpy() == 0).astype(int)
    X = df.rename(columns={
        "Triglycerides": "Triglyceride", "Visceral_Fat_Area": "VFA", "Visceral_Muscle_Area": "VMA",
    })
    return X, y


def run_nested_cv(X, y):
    out = []
    oof_dump = []
    t0 = time.time()
    for seed in (42, 123):
        oof = np.full(len(y), np.nan)
        oof_lr = np.full(len(y), np.nan)
        oo_thr = np.full(len(y), np.nan)
        for fold, (tr, te) in enumerate(StratifiedKFold(5, shuffle=True, random_state=seed).split(X, y), 1):
            inner = list(StratifiedKFold(3, shuffle=True, random_state=seed + fold).split(X.iloc[tr], y[tr]))
            candidate_scores = []
            for config in candidates:
                pipe = model(*config)
                score = np.mean(cross_val_score(
                    pipe, X.iloc[tr], y[tr], cv=inner, scoring="roc_auc", n_jobs=1, error_score="raise",
                ))
                candidate_scores.append(score)
            wi = int(np.argmax(candidate_scores))
            selected = candidates[wi]
            pipe = model(*selected)
            training_proba = cross_val_predict(pipe, X.iloc[tr], y[tr], cv=inner, method="predict_proba", n_jobs=1)[:, 1]
            threshold = cutoff_train(y[tr], training_proba)
            pipe.fit(X.iloc[tr], y[tr])
            p = pipe.predict_proba(X.iloc[te])[:, 1]
            baseline = model("LR", True, 22, 1)
            baseline.fit(X.iloc[tr], y[tr])
            plr = baseline.predict_proba(X.iloc[te])[:, 1]
            oof[te] = p
            oof_lr[te] = plr
            oo_thr[te] = threshold
            out.append({
                "seed": seed, "outer_fold": fold, "selected_family": selected[0], "selected": str(selected),
                "inner_selected_auc": candidate_scores[wi], "heldout_auc": roc_auc_score(y[te], p),
                "heldout_auc_lr_baseline": roc_auc_score(y[te], plr),
                "heldout_accuracy_05": accuracy_score(y[te], p >= 0.5),
                "heldout_accuracy_training_threshold": accuracy_score(y[te], p >= threshold),
                "train_selected_threshold": threshold, "heldout_lr_accuracy_05": accuracy_score(y[te], plr >= 0.5),
            })
            print(f"seed={seed} fold={fold} selected={selected} inner={candidate_scores[wi]:.4f} "
                  f"outerAUC={out[-1]['heldout_auc']:.4f} ACC={out[-1]['heldout_accuracy_05']:.4f}", flush=True)
        for idx in range(len(y)):
            oof_dump.append({
                "seed": seed, "row_id": idx, "y": int(y[idx]), "nested_probability": float(oof[idx]),
                "fixed_lr_probability": float(oof_lr[idx]), "training_threshold": float(oo_thr[idx]),
            })
        print("SEED", seed, "NESTED_POOLED_AUC", roc_auc_score(y, oof), "ACC", accuracy_score(y, oof >= 0.5),
              "elapsed", time.time() - t0, flush=True)
    return pd.DataFrame(out), pd.DataFrame(oof_dump)


def curve_points(yt, p, n=60):
    fpr, tpr, _ = roc_curve(yt, p)
    idx = np.unique(np.linspace(0, len(fpr) - 1, min(n, len(fpr))).astype(int))
    roc = [{"fpr": float(fpr[i]), "tpr": float(tpr[i])} for i in idx]
    pr, rc, _ = precision_recall_curve(yt, p)
    idx2 = np.unique(np.linspace(0, len(pr) - 1, min(n, len(pr))).astype(int))
    pr_curve = [{"recall": float(rc[i]), "precision": float(pr[i])} for i in idx2]
    true_prop, pred_prob = calibration_curve(yt, p, n_bins=7, strategy="quantile")
    calib = [{"predicted": float(a), "observed": float(b)} for a, b in zip(pred_prob, true_prop)]
    return roc, pr_curve, calib


def main():
    X, y = load_data()
    out, oof_dump = run_nested_cv(X, y)
    out.to_csv(ARTIFACTS / "nested_fold_results.csv", index=False)

    family_leaderboard = (
        out.groupby("selected_family")["heldout_auc"].agg(["mean", "std", "count"]).reset_index()
        .sort_values("mean", ascending=False)
    )

    oof_table = pd.DataFrame(oof_dump)
    part42 = oof_table.query("seed == 42").sort_values("row_id")
    yt = part42.y.to_numpy()
    p = part42.nested_probability.to_numpy()
    base = part42.fixed_lr_probability.to_numpy()

    roc_pts, pr_pts, calib_pts = curve_points(yt, p)
    roc_base_pts, _, _ = curve_points(yt, base)
    cm = confusion_matrix(yt, p >= 0.5).tolist()

    rng = np.random.default_rng(470)
    bootstrap = []
    for _ in range(2000):
        idx = np.r_[
            rng.choice(np.flatnonzero(yt == 0), int((yt == 0).sum()), replace=True),
            rng.choice(np.flatnonzero(yt == 1), int((yt == 1).sum()), replace=True),
        ]
        bootstrap.append((roc_auc_score(yt[idx], p[idx]), accuracy_score(yt[idx], p[idx] >= 0.5)))
    bootstrap = np.asarray(bootstrap)
    ci = {
        "auc_95": [float(x) for x in np.quantile(bootstrap[:, 0], [0.025, 0.975])],
        "accuracy_95": [float(x) for x in np.quantile(bootstrap[:, 1], [0.025, 0.975])],
    }

    # --- Final full-data model: best family by nested evidence, all candidates re-checked on all data ---
    all_inner = list(StratifiedKFold(3, shuffle=True, random_state=SEED + 777).split(X, y))
    full_scores = [float(np.mean(cross_val_score(model(*cfg), X, y, cv=all_inner, scoring="roc_auc", n_jobs=1)))
                   for cfg in candidates]
    best_cfg = candidates[int(np.argmax(full_scores))]
    candidate_leaderboard = sorted(
        [{"family": c[0], "config": str(c), "full_data_cv_auc": s} for c, s in zip(candidates, full_scores)],
        key=lambda r: -r["full_data_cv_auc"],
    )
    final_estimator = model(*best_cfg).fit(X, y)
    joblib.dump(final_estimator, ARTIFACTS / "final_model.joblib")

    feature_names = list(X.columns)

    importances = None
    clf = final_estimator.named_steps["clf"]
    try:
        fe_out = final_estimator.named_steps["fe"].get_feature_names_out()
        if "select" in final_estimator.named_steps:
            mask = final_estimator.named_steps["select"].get_support()
            selected_names = np.array(fe_out)[mask]
        else:
            selected_names = fe_out
        if hasattr(clf, "feature_importances_"):
            importances = sorted(
                zip(selected_names, [float(v) for v in clf.feature_importances_]),
                key=lambda t: -t[1],
            )[:15]
        elif hasattr(clf, "coef_"):
            importances = sorted(
                zip(selected_names, [float(abs(v)) for v in clf.coef_[0]]),
                key=lambda t: -t[1],
            )[:15]
    except Exception:
        importances = None

    metrics = {
        "dataset": {"rows": int(len(y)), "positives": int(y.sum()), "negatives": int((1 - y).sum()),
                    "features": feature_names},
        "nested_cv": {
            "outer_partitions": [42, 123], "outer_folds_per_partition": 5, "inner_folds": 3,
            "candidate_count": len(candidates),
            "mean_outer_auc": float(out.heldout_auc.mean()), "std_outer_auc": float(out.heldout_auc.std()),
            "mean_outer_accuracy": float(out.heldout_accuracy_05.mean()),
            "mean_baseline_auc": float(out.heldout_auc_lr_baseline.mean()),
            "pooled_auc_seed42": float(roc_auc_score(yt, p)),
            "pooled_accuracy_seed42": float(accuracy_score(yt, p >= 0.5)),
            "f1": float(f1_score(yt, p >= 0.5)), "mcc": float(matthews_corrcoef(yt, p >= 0.5)),
            "sensitivity": float(recall_score(yt, p >= 0.5)),
            "specificity": float(((p < 0.5) & (yt == 0)).sum() / max((yt == 0).sum(), 1)),
            "balanced_accuracy": float(balanced_accuracy_score(yt, p >= 0.5)),
            "precision": float(precision_score(yt, p >= 0.5)),
            "average_precision": float(average_precision_score(yt, p)),
            "brier_score": float(brier_score_loss(yt, p)),
            "bootstrap_ci_95": ci,
        },
        "family_leaderboard": family_leaderboard.to_dict(orient="records"),
        "candidate_leaderboard": candidate_leaderboard,
        "final_model": {
            "configuration": list(best_cfg), "inner_cv_auc_training_only": float(max(full_scores)),
            "warning": "Full-data model selection/training is used for the application backend only; "
                       "it is not an external or independent validation.",
        },
        "curves": {
            "roc_nested": roc_pts, "roc_baseline": roc_base_pts, "pr_nested": pr_pts, "calibration": calib_pts,
            "confusion_matrix": cm,
        },
        "feature_importance": importances,
        "fold_results": out.to_dict(orient="records"),
    }
    (ARTIFACTS / "metrics.json").write_text(json.dumps(metrics, indent=2))

    schema = build_feature_schema(X)
    (ARTIFACTS / "feature_schema.json").write_text(json.dumps(schema, indent=2))

    print("DONE. Best family by nested outer AUC:")
    print(family_leaderboard.to_string(index=False))
    print("Final deployed config:", best_cfg, "full-data inner CV AUC:", max(full_scores))


CATEGORY_MAP = {
    "Age": "Demographics", "Sex": "Demographics", "Height": "Demographics", "Weight": "Demographics", "BMI": "Demographics",
    "Comorbidity": "Comorbidities", "CAD": "Comorbidities", "Hypothyroidism": "Comorbidities",
    "Hyperlipidemia": "Comorbidities", "DM": "Comorbidities",
    "TBW": "Body Composition", "ECW": "Body Composition", "ICW": "Body Composition", "ECF_TBW": "Body Composition",
    "Total_Body_Fat_Ratio": "Body Composition", "Lean_Mass": "Body Composition", "Protein": "Body Composition",
    "Visceral_Adiposity_Index": "Body Composition", "Bone_Mass": "Body Composition", "Muscle_Mass": "Body Composition",
    "Obesity": "Body Composition", "Total_Fat": "Body Composition", "VFA": "Body Composition",
    "VMA": "Body Composition", "Hepatic_Fat": "Body Composition",
    "Glucose": "Laboratory", "Total_Cholesterol": "Laboratory", "LDL": "Laboratory", "HDL": "Laboratory",
    "Triglyceride": "Laboratory", "AST": "Laboratory", "ALT": "Laboratory", "ALP": "Laboratory",
    "Creatinine": "Laboratory", "GFR": "Laboratory", "CRP": "Laboratory", "HGB": "Laboratory", "Vitamin_D": "Laboratory",
}

LABEL_MAP = {
    "BMI": "Body Mass Index", "TBW": "Total Body Water", "ECW": "Extracellular Water",
    "ICW": "Intracellular Water", "ECF_TBW": "ECF/TBW Ratio", "VFA": "Visceral Fat Area",
    "VMA": "Visceral Muscle Area", "CAD": "Coronary Artery Disease", "DM": "Diabetes Mellitus",
    "HGB": "Hemoglobin", "CRP": "C-Reactive Protein", "GFR": "Glomerular Filtration Rate",
    "ALT": "Alanine Aminotransferase (ALT)", "AST": "Aspartate Aminotransferase (AST)",
    "ALP": "Alkaline Phosphatase", "LDL": "LDL Cholesterol", "HDL": "HDL Cholesterol",
}

BINARY = {"Sex", "CAD", "Hypothyroidism", "Hyperlipidemia", "DM"}
ORDINAL = {"Comorbidity": 3, "Visceral_Adiposity_Index": 31, "Hepatic_Fat": 4}


def build_feature_schema(X: pd.DataFrame):
    schema = []
    for col in X.columns:
        series = X[col]
        entry = {
            "key": col,
            "label": LABEL_MAP.get(col, col.replace("_", " ")),
            "category": CATEGORY_MAP.get(col, "Other"),
            "min": float(series.min()),
            "max": float(series.max()),
            "mean": float(series.mean()),
            "step": 1.0 if pd.api.types.is_integer_dtype(series) and col not in BINARY else 0.1,
        }
        if col in BINARY:
            entry["type"] = "binary"
        elif col in ORDINAL:
            entry["type"] = "ordinal"
        else:
            entry["type"] = "continuous"
        schema.append(entry)
    return schema


if __name__ == "__main__":
    main()
