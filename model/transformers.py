"""Fold-local feature engineering / preprocessing shared by training and the backend.

Kept in their own module (rather than inline in train.py) so joblib can
unpickle the trained Pipeline anywhere this module is importable.
"""
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


class ClinicalFeatures(BaseEstimator, TransformerMixin):
    def __init__(self, enabled=True):
        self.enabled = enabled

    def fit(self, X, y=None):
        self.input_features_ = list(X.columns)
        return self

    def transform(self, X):
        D = X.copy() if isinstance(X, pd.DataFrame) else pd.DataFrame(X, columns=self.input_features_)
        if not self.enabled:
            return D

        def pair(a, b, n, product=False):
            if a in D.columns and b in D.columns:
                x = D[a].astype(float)
                z = D[b].astype(float)
                D[n] = (x * z) if product else (x / z.where(z.abs() > 1e-8, np.nan))

        for a, b, n in [
            ("AST", "ALT", "AST_ALT_ratio"), ("LDL", "HDL", "LDL_HDL_ratio"),
            ("Triglyceride", "HDL", "TG_HDL_ratio"), ("CRP", "HGB", "CRP_HGB_ratio"),
            ("ECW", "TBW", "ECW_TBW_ratio"), ("Total_Fat", "Muscle_Mass", "Fat_Muscle_ratio"),
            ("VFA", "VMA", "VFA_VMA_ratio"),
        ]:
            pair(a, b, n)
        for a, b, n in [
            ("CRP", "HGB", "CRP_times_HGB"), ("Vitamin_D", "Hyperlipidemia", "VitD_times_Hyperlip"),
            ("BMI", "VFA", "BMI_times_VFA"), ("Age", "CRP", "Age_times_CRP"),
            ("Glucose", "DM", "Glucose_times_DM"),
        ]:
            pair(a, b, n, True)
        return D.replace([np.inf, -np.inf], np.nan)

    def get_feature_names_out(self, input_features=None):
        data = pd.DataFrame(np.ones((1, len(self.input_features_))), columns=self.input_features_)
        return np.array(self.transform(data).columns, dtype=object)


class ClipByTrainingQuantiles(BaseEstimator, TransformerMixin):
    def __init__(self, lower=0.01, upper=0.99):
        self.lower = lower
        self.upper = upper

    def fit(self, X, y=None):
        self.lo_ = np.nanquantile(np.asarray(X, dtype=float), self.lower, axis=0)
        self.hi_ = np.nanquantile(np.asarray(X, dtype=float), self.upper, axis=0)
        return self

    def transform(self, X):
        return np.clip(np.asarray(X, dtype=float), self.lo_, self.hi_)
