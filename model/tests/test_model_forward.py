"""
Unit test: GNN model forward pass shape and output range.

Purpose:
    Verify that the GNNModel produces the correct output tensor shape
    and that all probabilities are in [0, 1].

Run:
    pytest model/tests/test_model_forward.py -v

Author: LingoTax Team (HackAI 2026)
"""

import sys
from pathlib import Path

import torch
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from GNN_models.gnn import GNNModel, NUM_DEDUCTIONS


class TestGNNForward:
    """Forward pass tests for GNNModel."""

    @pytest.fixture
    def model(self):
        return GNNModel(input_dim=30, hidden_dim=16, num_deductions=NUM_DEDUCTIONS, num_layers=2)

    def test_output_shape(self, model):
        """Output shape must be (batch_size, num_deductions)."""
        batch_size = 10
        x = torch.randn(batch_size, 30)
        probs = model(x)
        assert probs.shape == (batch_size, NUM_DEDUCTIONS), \
            f"Expected ({batch_size}, {NUM_DEDUCTIONS}), got {probs.shape}"

    def test_output_range(self, model):
        """All probabilities must be in [0, 1] (sigmoid output)."""
        x = torch.randn(20, 30)
        probs = model(x)
        assert probs.min().item() >= 0.0, "Probabilities must be >= 0"
        assert probs.max().item() <= 1.0, "Probabilities must be <= 1"

    def test_single_sample(self, model):
        """Model should handle a single sample."""
        x = torch.randn(1, 30)
        probs = model(x)
        assert probs.shape == (1, NUM_DEDUCTIONS)

    def test_subset_deductions(self, model):
        """Test scoring a subset of deductions via ded_idx."""
        x = torch.randn(5, 30)
        ded_idx = torch.tensor([0, 2, 4])
        probs = model(x, ded_idx=ded_idx)
        assert probs.shape == (5, 3), f"Expected (5, 3), got {probs.shape}"

    def test_grad_flows(self, model):
        """Gradients should flow through the entire model."""
        x = torch.randn(5, 30, requires_grad=True)
        probs = model(x)
        loss = probs.sum()
        loss.backward()
        assert x.grad is not None, "Gradients should flow to input"

    def test_eval_mode(self, model):
        """Model should work in eval mode (no dropout)."""
        model.eval()
        x = torch.randn(5, 30)
        with torch.no_grad():
            probs = model(x)
        assert probs.shape == (5, NUM_DEDUCTIONS)
