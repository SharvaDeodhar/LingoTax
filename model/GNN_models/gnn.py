"""
GNN Deduction Predictor — PyTorch + PyTorch Geometric.

Purpose:
    GraphSAGE-based model that predicts which tax deductions a user
    is eligible for, given their encoded feature vector.

Architecture:
    1.  User features → 2-layer GraphSAGE convolution (when edge_index provided)
        OR simple MLP projection (when no graph structure).
    2.  Learnable deduction embeddings (one vector per deduction).
    3.  Bilinear scoring: score(user_i, ded_j) = σ(user_emb · W · ded_emb).

Author: LingoTax Team (HackAI 2026)
"""

import json
import logging
from pathlib import Path
from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger(__name__)

# Try importing PyG; fall back gracefully for CPU-only / non-PyG envs.
try:
    from torch_geometric.nn import SAGEConv
    HAS_PYG = True
except ImportError:
    HAS_PYG = False
    logger.warning("PyTorch Geometric not installed — using MLP fallback (no graph convolution).")

NUM_DEDUCTIONS = 8


class GNNModel(nn.Module):
    """
    GNN-based deduction predictor.

    Parameters
    ----------
    input_dim : int
        Dimensionality of the encoded user feature vector.
    hidden_dim : int
        Hidden layer width.
    num_deductions : int
        Number of deduction categories to predict (default 8).
    num_layers : int
        Number of GraphSAGE (or MLP) layers.
    dropout : float
        Dropout probability between layers.
    """

    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 64,
        num_deductions: int = NUM_DEDUCTIONS,
        num_layers: int = 2,
        dropout: float = 0.3,
    ):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_deductions = num_deductions
        self.num_layers = num_layers
        self.dropout = dropout

        # ── Encoder layers ────────────────────────────────────────────────────
        self.convs = nn.ModuleList()
        if HAS_PYG:
            self.convs.append(SAGEConv(input_dim, hidden_dim))
            for _ in range(num_layers - 1):
                self.convs.append(SAGEConv(hidden_dim, hidden_dim))
        else:
            # MLP fallback when PyG is missing
            self.convs.append(nn.Linear(input_dim, hidden_dim))
            for _ in range(num_layers - 1):
                self.convs.append(nn.Linear(hidden_dim, hidden_dim))

        self.norms = nn.ModuleList([nn.BatchNorm1d(hidden_dim) for _ in range(num_layers)])

        # ── Deduction embeddings (learnable) ──────────────────────────────────
        self.ded_embeddings = nn.Embedding(num_deductions, hidden_dim)

        # ── Bilinear scoring head ─────────────────────────────────────────────
        self.bilinear = nn.Bilinear(hidden_dim, hidden_dim, 1)

    def encode_users(
        self,
        user_x: torch.Tensor,
        edge_index: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """Encode raw user features into hidden representations."""
        h = user_x
        for i, conv in enumerate(self.convs):
            if HAS_PYG and edge_index is not None:
                h = conv(h, edge_index)
            else:
                h = conv(h)
            h = self.norms[i](h)
            h = F.relu(h)
            h = F.dropout(h, p=self.dropout, training=self.training)
        return h

    def forward(
        self,
        user_x: torch.Tensor,
        edge_index: Optional[torch.Tensor] = None,
        ded_idx: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """
        Forward pass.

        Parameters
        ----------
        user_x : Tensor (num_users, input_dim)
            Encoded user features.
        edge_index : Tensor (2, num_edges), optional
            Graph connectivity for GraphSAGE convolution.
        ded_idx : Tensor (num_deductions,), optional
            Deduction indices to score. If None, score all deductions.

        Returns
        -------
        probs : Tensor (num_users, num_deductions)
            Predicted probability for each (user, deduction) pair.
        """
        user_emb = self.encode_users(user_x, edge_index)  # (N, H)

        if ded_idx is None:
            ded_idx = torch.arange(self.num_deductions, device=user_x.device)

        ded_emb = self.ded_embeddings(ded_idx)  # (D, H)

        num_users = user_emb.size(0)
        num_deds = ded_emb.size(0)

        # Expand for bilinear: (N, D, H) each
        user_exp = user_emb.unsqueeze(1).expand(-1, num_deds, -1).reshape(-1, self.hidden_dim)
        ded_exp = ded_emb.unsqueeze(0).expand(num_users, -1, -1).reshape(-1, self.hidden_dim)

        scores = self.bilinear(user_exp, ded_exp).reshape(num_users, num_deds)
        probs = torch.sigmoid(scores)
        return probs

    # ── Persistence ───────────────────────────────────────────────────────────

    def save_model(self, path: str) -> None:
        """Save state_dict and architecture metadata."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(self.state_dict(), path)
        meta = {
            "input_dim": self.input_dim,
            "hidden_dim": self.hidden_dim,
            "num_deductions": self.num_deductions,
            "num_layers": self.num_layers,
            "dropout": self.dropout,
        }
        meta_path = path.with_suffix(".meta.json")
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)
        logger.info("Model saved to %s (meta: %s)", path, meta_path)

    @classmethod
    def load_model(cls, path: str, device: str = "cpu") -> "GNNModel":
        """Load a saved GNNModel from checkpoint + metadata."""
        path = Path(path)
        meta_path = path.with_suffix(".meta.json")
        with open(meta_path) as f:
            meta = json.load(f)
        model = cls(**meta)
        model.load_state_dict(torch.load(path, map_location=device, weights_only=True))
        model.to(device)
        model.eval()
        logger.info("Model loaded from %s on %s", path, device)
        return model
