"""FastAPI backend serving the gallstone risk model, study results, and
(when built) the Next.js static-exported frontend from the same origin.

Run from the project root: uvicorn backend.main:app --reload --port 8000
(must run from the root so `model.transformers` resolves for joblib.)
"""
import json
import os
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, create_model

from model.transformers import ClinicalFeatures, ClipByTrainingQuantiles  # noqa: F401 (needed for unpickling)

ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS = ROOT / "model" / "artifacts"
FRONTEND_DIR = ROOT / "frontend" / "out"

app = FastAPI(title="Gallstone Risk Model API", version="1.0.0")

_origins_env = os.environ.get("CORS_ORIGINS", "*")
_allow_origins = ["*"] if _origins_env == "*" else [o.strip() for o in _origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
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


@app.get("/api/health")
def health():
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


# --- Serve the Next.js static export (frontend/out), if it has been built. ---
# Registered last so it never shadows the /api/* routes above.
if FRONTEND_DIR.exists():
    next_assets = FRONTEND_DIR / "_next"
    if next_assets.exists():
        app.mount("/_next", StaticFiles(directory=next_assets), name="next-static")

    _frontend_root = FRONTEND_DIR.resolve()

    def _safe_under_root(candidate: Path) -> Path | None:
        resolved = candidate.resolve()
        if resolved == _frontend_root or _frontend_root in resolved.parents:
            return resolved
        return None

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        candidates = (
            [FRONTEND_DIR / "index.html"]
            if full_path == ""
            else [
                FRONTEND_DIR / full_path,
                FRONTEND_DIR / f"{full_path}.html",
                FRONTEND_DIR / full_path / "index.html",
            ]
        )
        target = next(
            (p for c in candidates if (p := _safe_under_root(c)) is not None and p.is_file()),
            None,
        )
        if target is None:
            not_found = FRONTEND_DIR / "404.html"
            if not_found.is_file():
                return FileResponse(not_found, status_code=404)
            raise HTTPException(status_code=404)
        return FileResponse(target)
