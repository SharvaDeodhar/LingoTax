"""
Task recommendations and generation endpoints.
Maps questionnaire answers to recommended tax forms and task lists.

GET  /tasks/recommendations – Returns forms + tasks based on user's questionnaire
POST /tasks/generate        – Persist auto-generated tasks + form checklist from questionnaire
"""

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from dependencies import get_current_user_id, get_user_supabase

router = APIRouter()

# ─── Mapping tables ───────────────────────────────────────────────────────────

# income_source value → form codes that apply
INCOME_TO_FORMS: dict = {
    "w2":         ["W-2"],
    "1099_nec":   ["1099-NEC", "Schedule C"],
    "1099_int":   ["1099-INT"],
    "1099_div":   ["1099-DIV"],
    "investments": ["1099-B", "Schedule D"],
    "1098_t":     ["1098-T"],
    "rental":     ["Schedule E"],
}

# Visa types that require Form 8843
FORM_8843_VISAS = {"F-1", "F-2", "J-1", "J-2", "OPT", "STEM OPT"}

# residency_status → primary return form
RESIDENCY_TO_FORM: dict = {
    "citizen":            "1040",
    "permanent_resident": "1040",
    "resident_alien":     "1040",
    "nonresident_alien":  "1040-NR",
    "dual_status":        "1040",   # also needs 1040-NR; add both
    "unsure":             "1040",
}


# ─── Recommendations endpoint (read-only) ────────────────────────────────────

@router.get("/recommendations")
async def get_task_recommendations(
    filing_year: int = 2024,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_user_supabase),
):
    """
    Build a personalized task list and form checklist from the user's questionnaire.
    Returns empty lists with a guidance message if no questionnaire exists yet.
    """
    q_res = (
        db.table("questionnaires")
        .select("*")
        .eq("user_id", user_id)
        .eq("filing_year", filing_year)
        .maybe_single()
        .execute()
    )

    if not q_res.data:
        return {
            "tasks": [],
            "recommended_forms": [],
            "message": "Complete your profile to receive personalized recommendations.",
        }

    q = q_res.data

    # ── Build recommended form codes ──────────────────────────────────────────
    recommended_codes = _get_recommended_form_codes(q)

    # Fetch matching catalog entries
    forms_res = (
        db.table("forms_catalog")
        .select("*")
        .in_("form_code", list(recommended_codes))
        .execute()
    )

    # ── Build task list ───────────────────────────────────────────────────────
    tasks = _build_tasks(q)

    return {
        "recommended_forms": forms_res.data or [],
        "tasks": tasks,
        "questionnaire": q,
    }


# ─── Generate endpoint (persists tasks + form checklist) ─────────────────────

@router.post("/generate")
async def generate_tasks(
    filing_year: int = 2024,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_user_supabase),
):
    """
    Persist auto-generated tasks and form checklist from the user's questionnaire.
    Deletes previously auto-generated tasks for idempotency, then inserts fresh ones.
    """
    return await _run_generate_tasks(filing_year, user_id, db)


@router.get("/debug_generate/{user_id}/{filing_year}")
async def debug_generate_tasks(
    user_id: str,
    filing_year: int,
    db: Client = Depends(get_user_supabase),
):
    # Pass the service role DB to bypass RLS for this debug endpoint
    from dependencies import get_service_supabase
    service_db = get_service_supabase()
    return await _run_generate_tasks(filing_year, user_id, service_db)


async def _run_generate_tasks(filing_year: int, user_id: str, db: Client):
    q_res = (
        db.table("questionnaires")
        .select("*")
        .eq("user_id", user_id)
        .eq("filing_year", filing_year)
        .maybe_single()
        .execute()
    )

    if not q_res.data:
        raise HTTPException(status_code=404, detail="No questionnaire found for this filing year.")

    q = q_res.data

    # ── Look up task_groups by name ───────────────────────────────────────────
    groups_res = db.table("task_groups").select("*").order("sort_order").execute()
    group_by_name: dict = {}
    for g in groups_res.data or []:
        group_by_name[g["name"]] = g["id"]

    # ── Delete previous auto-generated tasks ──────────────────────────────────
    db.table("tasks") \
        .delete() \
        .eq("user_id", user_id) \
        .eq("filing_year", filing_year) \
        .eq("auto_generated", True) \
        .execute()

    # ── Build and persist tasks ───────────────────────────────────────────────
    task_defs = _build_tasks(q)
    task_rows = []
    for i, t in enumerate(task_defs):
        group_id = group_by_name.get(t["group"])
        task_rows.append({
            "user_id": user_id,
            "task_group_id": group_id,
            "title": t["title"],
            "description": t.get("description"),
            "form_code": t.get("form_code"),
            "status": "not_started",
            "filing_year": filing_year,
            "sort_order": i,
            "auto_generated": True,
        })

    inserted_tasks = []
    if task_rows:
        res = db.table("tasks").insert(task_rows).execute()
        inserted_tasks = res.data or []

    # ── Build and persist form checklist ───────────────────────────────────────
    recommended_codes = _get_recommended_form_codes(q)

    # Fetch matching catalog entries
    forms_res = (
        db.table("forms_catalog")
        .select("*")
        .in_("form_code", list(recommended_codes))
        .execute()
    )
    catalog_forms = forms_res.data or []

    # Delete existing checklist for this user+year, then insert fresh
    db.table("user_form_checklist") \
        .delete() \
        .eq("user_id", user_id) \
        .eq("filing_year", filing_year) \
        .execute()

    checklist_rows = []
    for form in catalog_forms:
        checklist_rows.append({
            "user_id": user_id,
            "form_id": form["id"],
            "filing_year": filing_year,
            "status": "pending",
        })

    inserted_checklist = []
    if checklist_rows:
        res = db.table("user_form_checklist").insert(checklist_rows).execute()
        inserted_checklist = res.data or []

    return {
        "tasks": inserted_tasks,
        "form_checklist": inserted_checklist,
        "recommended_forms": catalog_forms,
    }


# ─── Shared helpers ──────────────────────────────────────────────────────────

def _get_recommended_form_codes(q: dict) -> set:
    """Build the set of recommended form codes from questionnaire data."""
    recommended_codes: set = set()

    # Primary return based on residency
    primary_form = RESIDENCY_TO_FORM.get(q.get("residency_status", "unsure"), "1040")
    recommended_codes.add(primary_form)
    if q.get("residency_status") == "dual_status":
        recommended_codes.add("1040-NR")

    # Income-driven forms
    for source in q.get("income_sources") or []:
        recommended_codes.update(INCOME_TO_FORMS.get(source, []))

    # Visa-driven forms
    visa = q.get("visa_type", "")
    if visa and visa in FORM_8843_VISAS:
        recommended_codes.add("Form 8843")

    return recommended_codes


def _build_tasks(q: dict) -> list:
    """Generate a recommended task list from questionnaire answers."""
    tasks = []

    # Personal group
    tasks.append(
        {
            "group": "Personal",
            "title": "Gather personal identification",
            "description": "SSN or ITIN, passport/visa, prior year tax return",
        }
    )
    tasks.append(
        {
            "group": "Personal",
            "title": "Confirm your filing status",
            "description": f"Currently set to: {q.get('filing_status', 'Not set')}",
        }
    )

    if q.get("num_dependents", 0) > 0:
        tasks.append(
            {
                "group": "Personal",
                "title": "Gather dependent information",
                "description": f"{q['num_dependents']} dependent(s): SSN/ITIN, date of birth, relationship",
            }
        )

    # Tax Forms group — one task per recommended form
    income_sources = q.get("income_sources") or []

    # W-2 tasks
    if "w2" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload W-2 (Wage and Tax Statement)",
            "description": "Reports wages paid and taxes withheld by your employer",
            "form_code": "W-2",
        })

    # 1099-NEC
    if "1099_nec" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload 1099-NEC (Nonemployee Compensation)",
            "description": "Reports freelance/self-employment income",
            "form_code": "1099-NEC",
        })

    # 1099-INT
    if "1099_int" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload 1099-INT (Interest Income)",
            "description": "Reports interest earned from bank accounts",
            "form_code": "1099-INT",
        })

    # 1099-DIV
    if "1099_div" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload 1099-DIV (Dividends and Distributions)",
            "description": "Reports dividends from investments",
            "form_code": "1099-DIV",
        })

    # Investments → 1099-B
    if "investments" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload 1099-B (Broker Transactions)",
            "description": "Reports stock/crypto sale proceeds",
            "form_code": "1099-B",
        })

    # 1098-T
    if "1098_t" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload 1098-T (Tuition Statement)",
            "description": "Reports tuition paid for education credits (American Opportunity or Lifetime Learning)",
            "form_code": "1098-T",
        })

    # Rental → Schedule E
    if "rental" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload Schedule E (Rental Income)",
            "description": "Reports rental income and losses",
            "form_code": "Schedule E",
        })

    # Primary return form
    residency = q.get("residency_status", "unsure")
    primary_form = RESIDENCY_TO_FORM.get(residency, "1040")
    if primary_form == "1040":
        tasks.append({
            "group": "Tax Forms",
            "title": "Complete Form 1040 (US Individual Income Tax Return)",
            "description": "Main federal tax return for residents/citizens",
            "form_code": "1040",
        })
    elif primary_form == "1040-NR":
        tasks.append({
            "group": "Tax Forms",
            "title": "Complete Form 1040-NR (Nonresident Alien Tax Return)",
            "description": "Federal tax return for nonresident aliens",
            "form_code": "1040-NR",
        })

    if residency == "dual_status":
        tasks.append({
            "group": "Tax Forms",
            "title": "Complete Form 1040-NR (Dual Status — Nonresident portion)",
            "description": "Required in addition to 1040 for dual-status filers",
            "form_code": "1040-NR",
        })

    # Self-employment — Schedule C
    if "1099_nec" in income_sources:
        tasks.append({
            "group": "Work Forms",
            "title": "Track business expenses for Schedule C",
            "description": "Home office, equipment, software, mileage — reduces self-employment tax",
            "form_code": "Schedule C",
        })

    # Investments — Schedule D
    if "investments" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Complete Schedule D (Capital Gains and Losses)",
            "description": "Summary of investment gains/losses",
            "form_code": "Schedule D",
        })

    # Visa-specific
    visa = q.get("visa_type", "")
    if visa in FORM_8843_VISAS:
        tasks.append(
            {
                "group": "Tax Forms",
                "title": f"Prepare Form 8843 ({visa} visa)",
                "description": "Required for exempt individuals — must be filed even with zero income",
                "form_code": "Form 8843",
            }
        )

    # Multi-state
    states_worked = q.get("states_worked") or []
    if len(states_worked) > 1:
        tasks.append(
            {
                "group": "Other",
                "title": f"File state returns for: {', '.join(states_worked)}",
                "description": "You worked in multiple states — a separate state return may be required for each",
            }
        )

    # Residency edge case
    if q.get("residency_status") == "unsure":
        tasks.append(
            {
                "group": "Personal",
                "title": "Determine your tax residency status",
                "description": "Apply the Substantial Presence Test to determine if you're a resident or nonresident alien",
            }
        )

    return tasks
