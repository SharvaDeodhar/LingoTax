"""
Synthetic tax-profile dataset generator for the GNN deduction predictor.

Purpose:
    Generate N synthetic user profiles with binary deduction labels.
    Supports --distribution-aware sampling (IRS SOI-like distributions)
    and --noise label-flipping for robustness training.

Usage:
    python model/data/gen_synthetic.py --n 20000 --distribution-aware --noise 0.05 --seed 42

Output:
    model/data/users.csv   — columnar dataset
    model/data/manifest.json — generation metadata

Author: LingoTax Team (HackAI 2026)
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

DEDUCTIONS = [
    "foreign_tax_credit",
    "student_loan_interest",
    "standard_deduction",
    "earned_income_credit",
    "child_tax_credit",
    "educator_expense",
    "ira_deduction",
    "home_ownership_credit",
]

VISA_TYPES = [
    "none",      # US citizen / green card
    "F-1",
    "H-1B",
    "OPT",
    "L-1",
    "J-1",
    "O-1",
    "STEM OPT",
]

FILING_STATUSES = [
    "single",
    "married_filing_jointly",
    "married_filing_separately",
    "head_of_household",
    "qualifying_widow",
]

# Top-15 states by population (used for realistic sampling)
STATES = [
    "CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI",
    "NJ", "VA", "WA", "AZ", "MA",
]

# ── Distribution-aware sampling heuristics ────────────────────────────────────
# NOTE: Replace these with official IRS SOI tables for production accuracy.
# Source approximation: https://www.irs.gov/statistics/soi-tax-stats

# Income distribution (log-normal parameters approximating US AGI)
INCOME_MU = 10.7       # ~median $45k
INCOME_SIGMA = 0.9

# Filing status probabilities (approx SOI 2022)
FILING_STATUS_PROBS_SOI = [0.44, 0.32, 0.04, 0.15, 0.05]

# Visa distribution (most filers are citizens)
VISA_PROBS_SOI = [0.82, 0.04, 0.05, 0.02, 0.02, 0.02, 0.01, 0.02]

# State distribution (proportional to population, roughly)
STATE_PROBS_SOI = [
    0.12, 0.09, 0.07, 0.06, 0.04, 0.04, 0.04, 0.03, 0.03, 0.03,
    0.03, 0.03, 0.02, 0.02, 0.02,
]
# Normalize just in case
STATE_PROBS_SOI = [p / sum(STATE_PROBS_SOI) for p in STATE_PROBS_SOI]


def generate_profiles(n: int, rng: np.random.Generator, distribution_aware: bool) -> pd.DataFrame:
    """Generate n synthetic user profiles."""
    if distribution_aware:
        filing_status = rng.choice(FILING_STATUSES, size=n, p=FILING_STATUS_PROBS_SOI)
        visa_type = rng.choice(VISA_TYPES, size=n, p=VISA_PROBS_SOI)
        state = rng.choice(STATES, size=n, p=STATE_PROBS_SOI)
        total_income = np.clip(rng.lognormal(INCOME_MU, INCOME_SIGMA, size=n), 0, 2_000_000).astype(int)
    else:
        filing_status = rng.choice(FILING_STATUSES, size=n)
        visa_type = rng.choice(VISA_TYPES, size=n)
        state = rng.choice(STATES, size=n)
        total_income = rng.integers(8_000, 500_000, size=n)

    num_dependents = rng.integers(0, 5, size=n)
    # Foreign income: more likely for visa holders
    is_visa_holder = np.array([v != "none" for v in visa_type])
    foreign_income = np.where(
        is_visa_holder,
        rng.integers(0, 80_000, size=n),
        np.where(rng.random(n) < 0.08, rng.integers(0, 30_000, size=n), 0),
    )
    foreign_tax_paid = (foreign_income > 0).astype(int) & (rng.random(n) > 0.2).astype(int)
    student_loan_interest_paid = (rng.random(n) < 0.25).astype(int)
    paid_tuition = (rng.random(n) < 0.18).astype(int)
    owns_home = (rng.random(n) < 0.35).astype(int)
    years_in_us = np.where(is_visa_holder, rng.integers(1, 20, size=n), rng.integers(18, 60, size=n))

    df = pd.DataFrame({
        "user_id": np.arange(n),
        "visa_type": visa_type,
        "filing_status": filing_status,
        "num_dependents": num_dependents,
        "total_income": total_income,
        "foreign_income": foreign_income,
        "foreign_tax_paid": foreign_tax_paid,
        "student_loan_interest_paid": student_loan_interest_paid,
        "paid_tuition": paid_tuition,
        "owns_home": owns_home,
        "state": state,
        "years_in_us": years_in_us,
    })
    return df


def assign_deduction_labels(df: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    """Rule-based deduction label assignment (deterministic given features)."""
    n = len(df)

    # 1. foreign_tax_credit: foreign_tax_paid == 1 AND foreign_income > 0
    df["foreign_tax_credit"] = ((df["foreign_tax_paid"] == 1) & (df["foreign_income"] > 0)).astype(int)

    # 2. student_loan_interest: paid interest AND income < 85k (single) or < 170k (joint)
    income_cap = np.where(df["filing_status"] == "married_filing_jointly", 170_000, 85_000)
    df["student_loan_interest"] = ((df["student_loan_interest_paid"] == 1) & (df["total_income"] < income_cap)).astype(int)

    # 3. standard_deduction: most filers take it (~88%)
    df["standard_deduction"] = (rng.random(n) < 0.88).astype(int)

    # 4. earned_income_credit: income < $59k, has dependents OR single < $17k
    eic_thresh = np.where(df["num_dependents"] > 0, 59_000, 17_000)
    df["earned_income_credit"] = (df["total_income"] < eic_thresh).astype(int)

    # 5. child_tax_credit: has dependents AND income < $200k (single) / $400k (joint)
    ctc_cap = np.where(df["filing_status"] == "married_filing_jointly", 400_000, 200_000)
    df["child_tax_credit"] = ((df["num_dependents"] > 0) & (df["total_income"] < ctc_cap)).astype(int)

    # 6. educator_expense: random ~8% chance (proxy for being a K-12 educator)
    df["educator_expense"] = (rng.random(n) < 0.08).astype(int)

    # 7. ira_deduction: income < $78k AND age proxy (years_in_us > 5)
    df["ira_deduction"] = ((df["total_income"] < 78_000) & (df["years_in_us"] > 5) & (rng.random(n) < 0.30)).astype(int)

    # 8. home_ownership_credit: owns_home AND income < $150k
    df["home_ownership_credit"] = ((df["owns_home"] == 1) & (df["total_income"] < 150_000)).astype(int)

    return df


def add_noise(df: pd.DataFrame, noise_rate: float, rng: np.random.Generator) -> pd.DataFrame:
    """Randomly flip a fraction of deduction labels to simulate real-world noise."""
    if noise_rate <= 0:
        return df
    for ded in DEDUCTIONS:
        mask = rng.random(len(df)) < noise_rate
        df.loc[mask, ded] = 1 - df.loc[mask, ded]
    logger.info("Applied %.1f%% noise to %d deduction columns", noise_rate * 100, len(DEDUCTIONS))
    return df


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic tax-profile data for GNN training")
    parser.add_argument("--n", type=int, default=10_000, help="Number of synthetic profiles")
    parser.add_argument("--distribution-aware", action="store_true", help="Use IRS SOI-like distributions")
    parser.add_argument("--noise", type=float, default=0.0, help="Label noise rate (0.0–0.2)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--output-dir", type=str, default=None, help="Output directory (default: model/data/)")
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)

    out_dir = Path(args.output_dir) if args.output_dir else Path(__file__).parent
    out_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Generating %d profiles (distribution_aware=%s, noise=%.2f, seed=%d)",
                args.n, args.distribution_aware, args.noise, args.seed)

    df = generate_profiles(args.n, rng, args.distribution_aware)
    df = assign_deduction_labels(df, rng)
    df = add_noise(df, args.noise, rng)

    csv_path = out_dir / "users.csv"
    df.to_csv(csv_path, index=False)
    logger.info("Saved %d rows to %s", len(df), csv_path)

    # Manifest
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n": args.n,
        "seed": args.seed,
        "distribution_aware": args.distribution_aware,
        "noise_rate": args.noise,
        "deduction_counts": {ded: int(df[ded].sum()) for ded in DEDUCTIONS},
        "columns": list(df.columns),
    }
    manifest_path = out_dir / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    logger.info("Saved manifest to %s", manifest_path)


if __name__ == "__main__":
    main()
