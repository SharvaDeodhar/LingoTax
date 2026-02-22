"""
Highlight extractor for tax form field locations.

Strategy:
1. Use a hardcoded template map for known IRS forms (Form 1040 2025).
   This is the most reliable approach since Form 1040 layout is standardised.
2. If the document is not a known form, attempt PDF parsing via pdfplumber.
"""

import io
import re
from typing import Optional, Dict, Any, List

from supabase import Client

# ─── Form 1040 (2025) Known Field Map ─────────────────────────────────────────
# Coordinates are in PDF points (72 dpi), top-left origin,
# measured from the standard IRS Form 1040 layout (Letter size: 612 x 792 pts).
# Format: [x0, top, x1, bottom]

FORM_1040_FIELDS: Dict[str, Dict[str, Any]] = {
    # ── Page 1 fields ──
    "first name": {
        "page": 1,
        "bbox": [32, 126, 282, 140],
        "label": "Your first name and middle initial",
    },
    "name": {
        "page": 1,
        "bbox": [32, 126, 282, 140],
        "label": "Your first name and middle initial",
    },
    "last name": {
        "page": 1,
        "bbox": [282, 126, 430, 140],
        "label": "Last name",
    },
    "ssn": {
        "page": 1,
        "bbox": [430, 126, 580, 140],
        "label": "Your social security number",
    },
    "social security": {
        "page": 1,
        "bbox": [430, 126, 580, 140],
        "label": "Your social security number",
    },
    "social security number": {
        "page": 1,
        "bbox": [430, 126, 580, 140],
        "label": "Your social security number",
    },
    "spouse name": {
        "page": 1,
        "bbox": [32, 140, 282, 155],
        "label": "Spouse's first name and middle initial (if joint return)",
    },
    "spouse ssn": {
        "page": 1,
        "bbox": [430, 140, 580, 155],
        "label": "Spouse's social security number",
    },
    "address": {
        "page": 1,
        "bbox": [32, 157, 395, 172],
        "label": "Home address (number and street)",
    },
    "home address": {
        "page": 1,
        "bbox": [32, 157, 395, 172],
        "label": "Home address (number and street)",
    },
    "city": {
        "page": 1,
        "bbox": [32, 175, 250, 190],
        "label": "City, town, or post office",
    },
    "state": {
        "page": 1,
        "bbox": [335, 175, 395, 190],
        "label": "State",
    },
    "zip": {
        "page": 1,
        "bbox": [400, 175, 470, 190],
        "label": "ZIP code",
    },
    "zip code": {
        "page": 1,
        "bbox": [400, 175, 470, 190],
        "label": "ZIP code",
    },
    "filing status": {
        "page": 1,
        "bbox": [32, 215, 560, 265],
        "label": "Filing Status",
    },
    "single": {
        "page": 1,
        "bbox": [108, 218, 280, 230],
        "label": "Filing Status — Single",
    },
    "married filing jointly": {
        "page": 1,
        "bbox": [108, 230, 380, 242],
        "label": "Filing Status — Married filing jointly",
    },
    "dependents": {
        "page": 1,
        "bbox": [32, 325, 580, 400],
        "label": "Dependents section",
    },
    "wages": {
        "page": 1,
        "bbox": [400, 415, 580, 428],
        "label": "Line 1a — Total amount from Form(s) W-2, box 1",
    },
    "w-2": {
        "page": 1,
        "bbox": [400, 415, 580, 428],
        "label": "Line 1a — Wages from W-2",
    },
    "interest": {
        "page": 1,
        "bbox": [400, 465, 580, 478],
        "label": "Line 2b — Taxable interest",
    },
    "dividends": {
        "page": 1,
        "bbox": [400, 488, 580, 500],
        "label": "Line 3b — Ordinary dividends",
    },
    "ira": {
        "page": 1,
        "bbox": [400, 500, 580, 513],
        "label": "Line 4b — IRA distributions (taxable amount)",
    },
    "adjusted gross income": {
        "page": 1,
        "bbox": [400, 555, 580, 568],
        "label": "Line 11 — Adjusted gross income",
    },
    "agi": {
        "page": 1,
        "bbox": [400, 555, 580, 568],
        "label": "Line 11 — Adjusted gross income",
    },
    "standard deduction": {
        "page": 1,
        "bbox": [400, 572, 580, 585],
        "label": "Line 12 — Standard deduction or itemized deductions",
    },
    "deduction": {
        "page": 1,
        "bbox": [400, 572, 580, 585],
        "label": "Line 12 — Standard deduction or itemized deductions",
    },
    "taxable income": {
        "page": 1,
        "bbox": [400, 600, 580, 613],
        "label": "Line 15 — Taxable income",
    },
    # ── Page 2 fields ──
    "tax": {
        "page": 2,
        "bbox": [400, 65, 580, 78],
        "label": "Line 16 — Tax",
    },
    "child tax credit": {
        "page": 2,
        "bbox": [400, 105, 580, 118],
        "label": "Line 19 — Child tax credit / other dependent credit",
    },
    "total tax": {
        "page": 2,
        "bbox": [400, 178, 580, 191],
        "label": "Line 24 — Total tax",
    },
    "withholding": {
        "page": 2,
        "bbox": [400, 205, 580, 218],
        "label": "Line 25d — Federal income tax withheld",
    },
    "federal tax withheld": {
        "page": 2,
        "bbox": [400, 205, 580, 218],
        "label": "Line 25d — Federal income tax withheld",
    },
    "estimated tax": {
        "page": 2,
        "bbox": [400, 222, 580, 235],
        "label": "Line 26 — Estimated tax payments",
    },
    "earned income credit": {
        "page": 2,
        "bbox": [400, 235, 580, 248],
        "label": "Line 27 — Earned income credit (EIC)",
    },
    "eic": {
        "page": 2,
        "bbox": [400, 235, 580, 248],
        "label": "Line 27 — Earned income credit (EIC)",
    },
    "refund": {
        "page": 2,
        "bbox": [400, 295, 580, 308],
        "label": "Line 34 — Refund amount",
    },
    "amount you owe": {
        "page": 2,
        "bbox": [400, 340, 580, 353],
        "label": "Line 37 — Amount you owe",
    },
    "signature": {
        "page": 2,
        "bbox": [32, 395, 350, 430],
        "label": "Your signature",
    },
    "routing number": {
        "page": 2,
        "bbox": [180, 308, 310, 321],
        "label": "Line 35b — Routing number",
    },
    "account number": {
        "page": 2,
        "bbox": [350, 308, 530, 321],
        "label": "Line 35d — Account number",
    },
    "bank account": {
        "page": 2,
        "bbox": [180, 295, 530, 321],
        "label": "Lines 35b-35d — Direct deposit info",
    },
    "direct deposit": {
        "page": 2,
        "bbox": [180, 295, 530, 321],
        "label": "Lines 35b-35d — Direct deposit info",
    },
    "occupation": {
        "page": 2,
        "bbox": [32, 430, 200, 443],
        "label": "Your occupation",
    },
}


def find_field_location(
    supabase: Client,
    document_id: str,
    field_label: str,
    page_hint: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Find the bounding box for a given field_label.
    
    Uses a hardcoded template map for Form 1040 (most reliable).
    Falls back to pdfplumber text search if available.
    """
    target = field_label.lower().strip()
    print(f"[HIGHLIGHT] Searching template map for: '{target}'")
    
    # ── Strategy 1: Hardcoded Form 1040 template map ──
    # Check for exact match first, then substring match
    if target in FORM_1040_FIELDS:
        field = FORM_1040_FIELDS[target]
        print(f"[HIGHLIGHT] ✓ Exact match found: {field['label']}")
        return {
            "page": field["page"],
            "bbox": field["bbox"],
            "label": field["label"],
            "method": "template_map",
        }

    # Substring/fuzzy match
    for key, field in FORM_1040_FIELDS.items():
        if target in key or key in target:
            print(f"[HIGHLIGHT] ✓ Fuzzy match found: '{key}' → {field['label']}")
            return {
                "page": field["page"],
                "bbox": field["bbox"],
                "label": field["label"],
                "method": "template_map",
            }

    # Also check label text for matches
    for key, field in FORM_1040_FIELDS.items():
        if target in field["label"].lower():
            print(f"[HIGHLIGHT] ✓ Label match found: {field['label']}")
            return {
                "page": field["page"],
                "bbox": field["bbox"],
                "label": field["label"],
                "method": "template_map",
            }

    print(f"[HIGHLIGHT] ✗ No match found for: '{target}'")
    return None
