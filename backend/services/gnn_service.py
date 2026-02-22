import logging
import os
import sys
from pathlib import Path

# Provide access to the GNN_models package dynamically
# This resolves to LingoTax/model
MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "model"
sys.path.insert(0, str(MODEL_DIR))

# Now we can cleanly import from the model subproject
from GNN_models.infer import load_model_and_encoders, predict_from_user_json

logger = logging.getLogger(__name__)

class GNNService:
    def __init__(self):
        self.is_loaded = False
        self.model_path = str(MODEL_DIR / "models" / "checkpoints" / "gnn_v1.pt")
        self.device = "cuda" if os.environ.get("USE_GPU") == "1" else "cpu"

    def initialize(self):
        """Load the model and encoders exactly once."""
        if self.is_loaded:
            return

        if not Path(self.model_path).exists():
            logger.error(f"GNN checkpoint not found at {self.model_path}.")
            logger.warning("GNN Predictions will be disabled.")
            return

        try:
            load_model_and_encoders(model_path=self.model_path, device=self.device)
            self.is_loaded = True
            logger.info(f"Successfully loaded native GNN service from {self.model_path}")
        except Exception as e:
            logger.error(f"Failed to load native GNN service: {e}")

    def predict_for_profile(self, profile_data: dict) -> str:
        """
        Takes raw questionnaire data, formats it for the GNN, runs inference,
        and returns a string block designed to be injected into an LLM prompt.
        """
        if not self.is_loaded:
            return ""

        # Safely map Supabase fields to GNN expected schema
        gnn_input = {
            "visa_type": profile_data.get("visa_type", "none"),
            "filing_status": profile_data.get("filing_status", "single"),
            "total_income": 40000, # Fallbacks
            "foreign_income": 0,
            "foreign_tax_paid": 0,
            "state": "CA",
            "num_dependents": profile_data.get("num_dependents", 0) or 0,
            "years_in_us": 0,
            "paid_tuition": 0
        }

        # Questionnaire income is currently a string array. Let's make an educated guess
        # since the v2 questionnaire doesn't natively ask for exact numerical total_income
        # in the standard flow yet unless derived. We provide safe defaults.
        # This can be improved as the D5 specific income tables are queried later.
        
        # Determine states
        states = profile_data.get("states_worked", [])
        if states and len(states) > 0:
            gnn_input["state"] = states[0]

        try:
            # Predict top 3
            result = predict_from_user_json(gnn_input, top_k=3, device=self.device)
            top_deductions = result.get("top_deductions", [])
            
            if not top_deductions:
                return ""

            # Format strictly for the Prompt Context
            lines = ["\n[AI Tax Deduction Predictions]"]
            lines.append("Our internal GNN model predicts this user qualifies for the following deductions:")
            for d in top_deductions:
                name = d.get('name', '').replace('_', ' ').title()
                prob = d.get('prob', 0) * 100
                rationale = d.get('rationale', 'Based on profile features')
                lines.append(f"- {name} ({prob:.1f}% confidence): {rationale}")
            
            lines.append("Instruct the user about these specific deductions *in their requested language* and explain WHY they qualify based on the rationales above.")
            return "\n".join(lines) + "\n"
            
        except Exception as e:
            logger.error(f"GNN Inference failed: {e}")
            return ""

# Export a singleton
gnn_service = GNNService()
