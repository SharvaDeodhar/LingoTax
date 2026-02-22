"""
Lightweight inference wrapper for the GNN deduction predictor.

Purpose:
    Load a trained model + saved encoders, accept a user JSON payload,
    and return top-N predicted deductions with probabilities and rationales.

Usage:
    from model.GNN_models.infer import predict_from_user_json
    result = predict_from_user_json({"visa_type": "H-1B", ...})

Security:
    SSN-like patterns are masked before any logging to prevent PII leaks.
    NOTE: Supabase RLS should be enforced at the API layer — do not rely
    on this module for access control.

Author: LingoTax Team (HackAI 2026)
"""

import json
import logging
import re
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import torch

from .gnn import GNNModel
from .train_helpers import DEDUCTIONS, CATEGORICAL_COLS, NUMERICAL_COLS, load_encoders, encode_features

logger = logging.getLogger(__name__)

# ── PII masking ───────────────────────────────────────────────────────────────

SSN_PATTERN = re.compile(r"\b\d{3}-?\d{2}-?\d{4}\b")


def _mask_pii(obj: Any) -> Any:
    """Recursively mask SSN-like patterns in dicts/lists/strings."""
    if isinstance(obj, str):
        return SSN_PATTERN.sub("***-**-****", obj)
    if isinstance(obj, dict):
        return {k: _mask_pii(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_mask_pii(v) for v in obj]
    return obj


# ── Rationale generator ──────────────────────────────────────────────────────

RATIONALES = {
    "foreign_tax_credit": lambda u: "foreign_income > 0 and foreign_tax_paid == 1"
        if u.get("foreign_income", 0) > 0 and u.get("foreign_tax_paid", 0) == 1
        else "model prediction based on profile features",
    "student_loan_interest": lambda u: "student_loan_interest_paid == 1 and income within limit"
        if u.get("student_loan_interest_paid", 0) == 1
        else "model prediction based on profile features",
    "standard_deduction": lambda _: "most filers qualify for the standard deduction",
    "earned_income_credit": lambda u: f"total_income={u.get('total_income', '?')} is within EIC thresholds"
        if u.get("total_income", 999_999) < 60_000
        else "model prediction based on profile features",
    "child_tax_credit": lambda u: f"num_dependents={u.get('num_dependents', 0)} > 0"
        if u.get("num_dependents", 0) > 0
        else "model prediction based on profile features",
    "educator_expense": lambda _: "model prediction based on profile features",
    "ira_deduction": lambda u: "income within IRA deduction limits and years_in_us > 5"
        if u.get("total_income", 999_999) < 78_000 and u.get("years_in_us", 0) > 5
        else "model prediction based on profile features",
    "home_ownership_credit": lambda u: "owns_home == 1 and income < $150k"
        if u.get("owns_home", 0) == 1 and u.get("total_income", 999_999) < 150_000
        else "model prediction based on profile features",
}


# ── Globals (loaded once) ────────────────────────────────────────────────────

_model: GNNModel | None = None
_ohe = None
_scaler = None


def load_model_and_encoders(
    model_path: str = "model/models/checkpoints/gnn_v1.pt",
    encoders_dir: str | None = None,
    device: str = "cpu",
) -> None:
    """Load the GNN model and sklearn encoders into module-level globals."""
    global _model, _ohe, _scaler
    _model = GNNModel.load_model(model_path, device=device)
    _ohe, _scaler = load_encoders()
    logger.info("Inference engine ready (device=%s)", device)


def predict_from_user_json(
    user_json: dict,
    top_k: int = 3,
    device: str = "cpu",
) -> dict:
    """
    Predict deductions for a single user.

    Parameters
    ----------
    user_json : dict
        User profile fields matching the CSV schema.
    top_k : int
        Number of top deductions to return.

    Returns
    -------
    dict with keys:
        top_deductions — list of {name, prob, rationale}
        all_probs      — dict mapping deduction name to probability
    """
    if _model is None:
        raise RuntimeError("Model not loaded. Call load_model_and_encoders() first.")

    # Mask PII before any logging
    safe_json = _mask_pii(user_json)
    logger.info("Predicting deductions for user (masked): %s", json.dumps(safe_json, default=str)[:200])

    # Build a single-row dataframe
    df = pd.DataFrame([user_json])

    # Fill missing columns with defaults
    for col in CATEGORICAL_COLS:
        if col not in df.columns:
            df[col] = "none" if col == "visa_type" else "single" if col == "filing_status" else "CA"
    for col in NUMERICAL_COLS:
        if col not in df.columns:
            df[col] = 0

    features = encode_features(df, _ohe, _scaler)
    x = torch.tensor(features, dtype=torch.float32).to(device)

    with torch.no_grad():
        probs = _model(x).squeeze(0).cpu().numpy()  # (num_deductions,)

    # Map to names
    all_probs = {name: round(float(probs[i]), 4) for i, name in enumerate(DEDUCTIONS)}

    # Top-K
    top_indices = np.argsort(probs)[::-1][:top_k]
    top_deductions = []
    for idx in top_indices:
        name = DEDUCTIONS[idx]
        rationale_fn = RATIONALES.get(name, lambda _: "model prediction")
        top_deductions.append({
            "name": name,
            "prob": round(float(probs[idx]), 4),
            "rationale": rationale_fn(user_json),
        })

    return {
        "top_deductions": top_deductions,
        "all_probs": all_probs,
    }
