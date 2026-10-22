# Gallstone: exploratory model-improvement results (not a finished journal paper)

Dataset: 319 records, 38 original predictors; disease-positive n=158. SHA256: f8aaa71e4e6caff48b8131c8113eeedf68c3bef827ad18790a067ae1f80d5ad7.

After inspecting the previous user's nested results, we tested new linear/nonlinear model candidates. These runs re-use the same dataset and must be presented as **exploratory development**, not an untouched confirmatory test.

Nested CV: two stratified 5-fold partitions (seeds 42 and 123). Within each outer training fold, candidate selection uses internal 3-fold ROC-AUC; feature engineering, clipping, imputation, scaling and supervised selection happen in training folds. Every outer fold has held-out predictions. Default threshold 0.5 is evaluated separately from thresholds selected on inner training OOF predictions.

Mean of ten outer-fold AUCs: 0.8897; mean outer-fold accuracy: 0.8198. Per-seed pooled AUCs: 0.8961 and 0.8856. Mean outer-fold fixed-LR baseline AUC: 0.8838. Seed-42 conditional bootstrap 95% CI for AUC: [0.8605590062111801, 0.9295964698482586].

IMPORTANT: 10 folds are **not 10 independent cohorts**. No prospective or external dataset has been used. Repeated development on this same dataset makes improvement claims and conventional confidence intervals optimistic. The paired baseline comparison is descriptive. This result does not establish superiority to a previous paper or reach 95% AUC/accuracy. Clinical deployment is unsupported.

For a manuscript: first freeze the method and evaluate with a truly independent, preferably external cohort, reproduce relevant baselines on exactly the same split, document feature definitions and dataset licensing, and provide ethics and clinical validation statements where applicable.
