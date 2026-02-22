"""
Smoke test: end-to-end training on a tiny dataset.

Purpose:
    Run the full pipeline (generate data → train → checkpoint)
    on a small sample (500 rows) and verify artifacts are created.

Run:
    pytest model/tests/test_train_smoke.py -v -s

Author: LingoTax Team (HackAI 2026)
"""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parent.parent


class TestTrainSmoke:
    """Smoke tests for the training pipeline."""

    @pytest.fixture(autouse=True)
    def setup_paths(self, tmp_path):
        """Use a temporary directory for test outputs."""
        self.output_dir = tmp_path / "models"
        self.data_dir = tmp_path / "data"
        self.data_dir.mkdir()

    def test_generate_data(self):
        """gen_synthetic.py --small should create users.csv and manifest.json."""
        result = subprocess.run(
            [
                sys.executable,
                str(PROJECT_ROOT / "data" / "gen_synthetic.py"),
                "--n", "500",
                "--distribution-aware",
                "--noise", "0.05",
                "--seed", "42",
                "--output-dir", str(self.data_dir),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        assert result.returncode == 0, f"gen_synthetic failed: {result.stderr}"
        assert (self.data_dir / "users.csv").exists(), "users.csv not created"
        assert (self.data_dir / "manifest.json").exists(), "manifest.json not created"

    def test_train_smoke(self):
        """Full training smoke run on 500 samples, 3 epochs."""
        # Step 1: Generate data
        data_result = subprocess.run(
            [
                sys.executable,
                str(PROJECT_ROOT / "data" / "gen_synthetic.py"),
                "--n", "500",
                "--seed", "42",
                "--output-dir", str(self.data_dir),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        assert data_result.returncode == 0, f"Data gen failed: {data_result.stderr}"

        # Step 2: Train (must set PYTHONPATH so imports work)
        env = os.environ.copy()
        env["PYTHONPATH"] = str(PROJECT_ROOT)

        train_result = subprocess.run(
            [
                sys.executable,
                str(PROJECT_ROOT / "train" / "train_gnn.py"),
                "--small",
                "--epochs", "3",
                "--seed", "42",
                "--output-dir", str(self.output_dir),
            ],
            capture_output=True,
            text=True,
            timeout=60,
            env=env,
        )
        assert train_result.returncode == 0, f"Training failed: {train_result.stderr}"

        # Step 3: Verify artifacts
        ckpt_path = self.output_dir / "checkpoints" / "gnn_v1.pt"
        meta_path = self.output_dir / "metadata" / "gnn_v1.json"
        assert ckpt_path.exists(), f"Checkpoint not found at {ckpt_path}"
        assert meta_path.exists(), f"Metadata not found at {meta_path}"

        # Validate metadata contents
        with open(meta_path) as f:
            meta = json.load(f)
        assert meta["name"] == "gnn_v1"
        assert meta["train_size"] > 0
        assert "macro_auc" in meta.get("metrics", {})
