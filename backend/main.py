"""FastAPI backend serving the gallstone risk model and study results.

Run from the project root: uvicorn backend.main:app --reload --port 8000
(must run from the root so `model.transformers` resolves for joblib.)
"""
import json
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, create_model

from model.transformers import ClinicalFeatures, ClipByTrainingQuantiles  # noqa: F401 (needed for unpickling)

ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS = ROOT / "model" / "artifacts"

app = FastAPI(title="Gallstone Risk Model API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = joblib.load(ARTIFACTS / "final_model.joblib")
_metrics = json.loads((ARTIFACTS / "metrics.json").read_text())
_schema = json.loads((ARTIFACTS / "feature_schema.json").read_text())
_feature_order = [f["key"] for f in _schema]

_fields = {f["key"]: (float, ...) for f in _schema}
PatientInput = create_model("PatientInput", **_fields)


class PredictionResponse(BaseModel):
    probability: float
    risk_level: str
    predicted_class: int
    decision_threshold: float


def risk_level(p: float) -> str:
    if p < 0.3:
        return "Low"
    if p < 0.6:
        return "Moderate"
    return "High"


@app.get("/")
def root():
    return {"status": "ok", "model": "gallstone-risk-logreg"}


@app.get("/api/features")
def get_features():
    return {"features": _schema, "order": _feature_order}


@app.get("/api/metrics")
def get_metrics():
    return _metrics


@app.post("/api/predict", response_model=PredictionResponse)
def predict(payload: PatientInput):
    data = payload.model_dump()
    missing = [k for k in _feature_order if k not in data]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing features: {missing}")
    row = pd.DataFrame([{k: data[k] for k in _feature_order}])
    proba = float(_model.predict_proba(row)[:, 1][0])
    return PredictionResponse(
        probability=proba,
        risk_level=risk_level(proba),
        predicted_class=int(proba >= 0.5),
        decision_threshold=0.5,
    )
