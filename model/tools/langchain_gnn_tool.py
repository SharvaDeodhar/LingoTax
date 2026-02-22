"""
LangChain Tool wrapper for the GNN deduction predictor.

Purpose:
    Expose the GNN inference API as a LangChain Tool so the LLM
    (Gemini / GPT) can call it during a conversation to predict
    which tax deductions a user likely qualifies for.

Usage:
    from model.tools.langchain_gnn_tool import predict_deductions_tool

    # Register with your LangChain agent:
    from langchain.agents import initialize_agent, AgentType
    agent = initialize_agent(
        tools=[predict_deductions_tool],
        llm=your_llm,
        agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
    )

Author: LingoTax Team (HackAI 2026)
"""

import json
import logging
import os

import requests
from langchain.tools import tool

logger = logging.getLogger(__name__)

GNN_API_URL = os.getenv("GNN_API_URL", "http://localhost:8001")


@tool
def predict_deductions_tool(user_json: str) -> str:
    """
    Predict which US tax deductions a user likely qualifies for.

    Input: A JSON string with user profile fields:
        visa_type, filing_status, num_dependents, total_income,
        foreign_income, foreign_tax_paid, student_loan_interest_paid,
        paid_tuition, owns_home, state, years_in_us.

    Output: A JSON string with top_deductions (name, probability, rationale)
            and all_probs for each of the 8 deduction categories.

    Example input:
        {"visa_type": "H-1B", "filing_status": "single", "total_income": 75000,
         "foreign_income": 10000, "foreign_tax_paid": 1, "state": "OH",
         "num_dependents": 0, "years_in_us": 4}
    """
    try:
        user_data = json.loads(user_json) if isinstance(user_json, str) else user_json
    except json.JSONDecodeError as e:
        return json.dumps({"error": f"Invalid JSON input: {e}"})

    try:
        response = requests.post(
            f"{GNN_API_URL}/predict_deductions",
            json=user_data,
            timeout=10,
        )
        response.raise_for_status()
        result = response.json()
        return json.dumps(result, indent=2)
    except requests.ConnectionError:
        return json.dumps({"error": "GNN API is not reachable. Ensure model server is running."})
    except requests.HTTPError as e:
        return json.dumps({"error": f"GNN API returned error: {e.response.text}"})
    except Exception as e:
        return json.dumps({"error": f"Unexpected error calling GNN API: {e}"})
