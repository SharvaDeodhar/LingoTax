"""
FastAPI inference endpoint for the GNN deduction predictor.

Purpose:
    Serve the trained GNN model via a REST API.
    POST /predict_deductions accepts user features and returns
    top deductions with probabilities and rationales.

Usage:
    uvicorn model.api.fastapi_infer:app --host 0.0.0.0 --port 8001

Author: LingoTax Team (HackAI 2026)
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Pydantic models ──────────────────────────────────────────────────────────

class UserFeatures(BaseModel):
    """Input schema matching the synthetic CSV columns."""
    visa_type: str = "none"
    filing_status: str = "single"
    num_dependents: int = 0
    total_income: int = 40000
    foreign_income: int = 0
    foreign_tax_paid: int = 0
    student_loan_interest_paid: int = 0
    paid_tuition: int = 0
    owns_home: int = 0
    state: str = "OH"
    years_in_us: int = 25


class DeductionResult(BaseModel):
    name: str
    prob: float
    rationale: str


class PredictionResponse(BaseModel):
    top_deductions: list[DeductionResult]
    all_probs: dict[str, float]


# ── App lifecycle ─────────────────────────────────────────────────────────────

# Model paths — override via env vars if stored remotely
MODEL_PATH = os.getenv("GNN_MODEL_PATH", str(Path(__file__).resolve().parent.parent / "models" / "checkpoints" / "gnn_v1.pt"))
# NOTE: To download model from Google Drive or Supabase Storage on startup:
#   1. Check if MODEL_PATH exists on disk.
#   2. If not, download from https://<your-gdrive-or-supabase-url>
#   3. Use gdown (Google Drive) or supabase-py storage.download() (Supabase).
#   Example:
#     if not Path(MODEL_PATH).exists():
#         import gdown
#         gdown.download("<gdrive-url>", MODEL_PATH, quiet=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model and encoders once at startup."""
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from GNN_models.infer import load_model_and_encoders

    device = "cuda" if os.getenv("USE_GPU") else "cpu"
    try:
        load_model_and_encoders(model_path=MODEL_PATH, device=device)
        logger.info("GNN model loaded successfully")
    except Exception as e:
        logger.error("Failed to load GNN model: %s", e)
        logger.warning("Predictions will fail until a valid checkpoint is available at %s", MODEL_PATH)
    yield


app = FastAPI(
    title="LingoTax GNN Deduction Predictor",
    version="1.0.0",
    description="Predict likely tax deductions for a user profile using a trained GNN.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": "gnn_v1"}


@app.post("/predict_deductions", response_model=PredictionResponse)
def predict_deductions(user: UserFeatures):
    """Predict top tax deductions for a given user profile."""
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from GNN_models.infer import predict_from_user_json

    try:
        result = predict_from_user_json(user.model_dump(), top_k=3)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("Prediction error")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")
