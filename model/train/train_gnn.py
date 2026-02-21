"""
GNN training CLI — train the deduction predictor on synthetic data.

Purpose:
    End-to-end training loop with early stopping, metric logging,
    and model checkpoint saving.

Usage:
    python model/train/train_gnn.py --epochs 50 --gpu
    python model/train/train_gnn.py --small --epochs 5       # smoke test

Author: LingoTax Team (HackAI 2026)
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import roc_auc_score, precision_score, recall_score

# Add project root to path so imports work from any cwd
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from GNN_models.gnn import GNNModel
from GNN_models.train_helpers import build_dataset, DEDUCTIONS

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


def set_seed(seed: int) -> None:
    """Set all random seeds for reproducibility."""
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray) -> dict:
    """Compute per-deduction and macro metrics."""
    metrics = {}
    aucs = []
    for i, name in enumerate(DEDUCTIONS):
        try:
            auc = roc_auc_score(y_true[:, i], y_prob[:, i])
        except ValueError:
            auc = 0.0  # single class in batch
        prec = precision_score(y_true[:, i], y_pred[:, i], zero_division=0)
        rec = recall_score(y_true[:, i], y_pred[:, i], zero_division=0)
        metrics[name] = {"auc": round(auc, 4), "precision": round(prec, 4), "recall": round(rec, 4)}
        aucs.append(auc)

    metrics["macro_auc"] = round(float(np.mean(aucs)), 4)
    return metrics


def train(args: argparse.Namespace) -> None:
    set_seed(args.seed)

    device = "cuda" if args.gpu and torch.cuda.is_available() else "cpu"
    logger.info("Training on device: %s", device)

    # ── Data ──────────────────────────────────────────────────────────────────
    dataset = build_dataset(seed=args.seed, small=args.small)
    X_train = dataset["X_train"].to(device)
    y_train = dataset["y_train"].to(device)
    X_val = dataset["X_val"].to(device)
    y_val = dataset["y_val"].to(device)
    input_dim = dataset["input_dim"]

    logger.info("Train: %d samples, Val: %d samples, Features: %d",
                X_train.shape[0], X_val.shape[0], input_dim)

    # ── Model ─────────────────────────────────────────────────────────────────
    model = GNNModel(
        input_dim=input_dim,
        hidden_dim=args.hidden_dim,
        num_deductions=len(DEDUCTIONS),
        num_layers=2,
        dropout=0.3,
    ).to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-5)
    criterion = nn.BCELoss()
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)

    # ── Training loop ─────────────────────────────────────────────────────────
    best_val_loss = float("inf")
    patience_counter = 0
    patience = 10
    best_metrics = {}

    output_dir = Path(args.output_dir)
    ckpt_dir = output_dir / "checkpoints"
    meta_dir = output_dir / "metadata"
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    meta_dir.mkdir(parents=True, exist_ok=True)

    ckpt_path = ckpt_dir / "gnn_v1.pt"

    t0 = time.time()

    for epoch in range(1, args.epochs + 1):
        # Train
        model.train()
        optimizer.zero_grad()
        y_hat = model(X_train)
        loss = criterion(y_hat, y_train)
        loss.backward()
        optimizer.step()

        # Validate
        model.eval()
        with torch.no_grad():
            y_val_hat = model(X_val)
            val_loss = criterion(y_val_hat, y_val).item()

        scheduler.step(val_loss)

        if epoch % max(1, args.epochs // 10) == 0 or epoch == 1:
            logger.info("Epoch %3d/%d — train_loss=%.4f  val_loss=%.4f",
                        epoch, args.epochs, loss.item(), val_loss)

        # Early stopping
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0

            # Compute metrics on best
            y_prob = y_val_hat.cpu().numpy()
            y_pred = (y_prob > 0.5).astype(int)
            y_true = y_val.cpu().numpy()
            best_metrics = compute_metrics(y_true, y_pred, y_prob)

            model.save_model(str(ckpt_path))
        else:
            patience_counter += 1
            if patience_counter >= patience:
                logger.info("Early stopping at epoch %d", epoch)
                break

    elapsed = time.time() - t0
    logger.info("Training completed in %.1fs — best val_loss=%.4f, macro_auc=%.4f",
                elapsed, best_val_loss, best_metrics.get("macro_auc", 0))

    # ── Save metadata ─────────────────────────────────────────────────────────
    metadata = {
        "name": "gnn_v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "train_size": int(X_train.shape[0]),
        "val_size": int(X_val.shape[0]),
        "seed": args.seed,
        "hidden_dim": args.hidden_dim,
        "epochs": args.epochs,
        "learning_rate": args.lr,
        "best_val_loss": round(best_val_loss, 6),
        "metrics": best_metrics,
        "device": device,
        "elapsed_seconds": round(elapsed, 1),
        "git_commit": "PLACEHOLDER",  # Replace with actual git hash in CI/CD
        "download_url": "",
        "notes": "Trained on synthetic distribution-aware data. Replace with real IRS SOI data for production.",
    }
    meta_path = meta_dir / "gnn_v1.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    logger.info("Saved training metadata to %s", meta_path)

    # Print summary
    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print(f"  Checkpoint: {ckpt_path}")
    print(f"  Metadata:   {meta_path}")
    print(f"  Macro AUC:  {best_metrics.get('macro_auc', 'N/A')}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Train the GNN deduction predictor")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=256, help="(reserved for DataLoader)")
    parser.add_argument("--lr", type=float, default=0.001)
    parser.add_argument("--hidden-dim", type=int, default=64)
    parser.add_argument("--gpu", action="store_true")
    parser.add_argument("--small", action="store_true", help="Smoke test on 500 samples")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output-dir", type=str, default="model/models",
                        help="Directory for checkpoints and metadata")
    args = parser.parse_args()
    train(args)


if __name__ == "__main__":
    main()
