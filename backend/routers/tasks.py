"""
Task recommendations and generation endpoints.
Maps questionnaire answers to recommended tax forms and task lists.

GET  /tasks/recommendations         – Returns forms + tasks based on user's questionnaire
POST /tasks/sync_from_questionnaire – Persist auto-generated tasks + form checklist from questionnaire
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from dependencies import get_current_user_id, get_user_supabase

router = APIRouter()

# ─── Mapping tables ───────────────────────────────────────────────────────────

# income_source value → form codes that apply
INCOME_TO_FORMS: dict = {
    "w2":          ["W-2"],
    "1099_nec":    ["1099-NEC", "Schedule C"],
    "1099_int":    ["1099-INT"],
    "1099_div":    ["1099-DIV"],
    "investments": ["1099-B", "Schedule D"],
    "1098_t":      ["1098-T"],
    "rental":      ["Schedule E"],
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

    # ── Recommended forms ─────────────────────────────────────────────────────
    recommended_codes = _get_recommended_form_codes(q)
    forms_res = (
        db.table("forms_catalog")
        .select("*")
        .in_("form_code", list(recommended_codes))
        .execute()
    )

    # ── Recommended tasks ─────────────────────────────────────────────────────
    tasks = _build_tasks(q)

    return {
        "recommended_forms": forms_res.data or [],
        "tasks": tasks,
        "questionnaire": q,
    }


# ─── Sync endpoint (persists tasks + form checklist) ─────────────────────────

class SyncTasksRequest(BaseModel):
    filing_year: int = 2024


class SyncTasksResponse(BaseModel):
    created: int
    updated: int
    deleted: int
    checklist_count: int


@router.post("/sync_from_questionnaire", response_model=SyncTasksResponse)
async def sync_tasks_from_questionnaire(
    payload: SyncTasksRequest,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_user_supabase),
):
    """
    Materialize questionnaire-driven task recommendations into the tasks table AND
    refresh the user's form checklist.

    - Uses the same recommendation engine as /tasks/recommendations
    - Idempotent: re-running updates descriptions/order and prunes obsolete
      auto-generated tasks without touching user-created tasks.
    - Also refreshes user_form_checklist based on forms_catalog and questionnaire.
    """
    filing_year = payload.filing_year

    q_res = (
        db.table("questionnaires")
        .select("*")
        .eq("user_id", user_id)
        .eq("filing_year", filing_year)
        .maybe_single()
        .execute()
    )

    if not q_res.data:
        raise HTTPException(
            status_code=400,
            detail="No questionnaire found for this filing year; complete your profile first.",
        )

    q = q_res.data

    # Build recommended task payloads from questionnaire
    recommended_tasks = _build_tasks(q)

    # Load task groups so we can map group name → id
    groups_res = db.table("task_groups").select("*").execute()
    groups_by_name = {g["name"]: g for g in (groups_res.data or [])}

    # Ensure all referenced groups exist
    missing_groups = {t["group"] for t in recommended_tasks} - set(groups_by_name.keys())
    if missing_groups:
        insert_rows = [{"name": name, "sort_order": 99} for name in sorted(missing_groups)]
        inserted = db.table("task_groups").insert(insert_rows).execute()
        for g in inserted.data or []:
            groups_by_name[g["name"]] = g

    # Existing auto-generated tasks for this year/user (created from questionnaire)
    existing_res = (
        db.table("tasks")
        .select("*")
        .eq("user_id", user_id)
        .eq("filing_year", filing_year)
        .eq("source", "questionnaire")
        .execute()
    )
    existing_tasks = existing_res.data or []

    # Key existing tasks by (group_name, title)
    group_id_to_name = {g["id"]: g["name"] for g in groups_by_name.values()}
    existing_by_key: dict[tuple[str, str], dict] = {}
    for t in existing_tasks:
        g_name = group_id_to_name.get(t.get("task_group_id"))
        if g_name:
            existing_by_key[(g_name, t["title"])] = t

    created = 0
    updated = 0
    kept_ids: set[str] = set()

    # Upsert recommended tasks
    for idx, rec in enumerate(recommended_tasks):
        group_name = rec["group"]
        group = groups_by_name.get(group_name)
        if not group:
            continue

        key = (group_name, rec["title"])
        existing = existing_by_key.get(key)

        if existing:
            db.table("tasks").update(
                {
                    "description": rec.get("description"),
                    "form_code": rec.get("form_code"),
                    "sort_order": idx,
                    "task_group_id": group["id"],
                    "questionnaire_id": q["id"],
                    "auto_generated": True,
                    "source": "questionnaire",
                }
            ).eq("id", existing["id"]).execute()
            updated += 1
            kept_ids.add(existing["id"])
        else:
            db.table("tasks").insert(
                {
                    "user_id": user_id,
                    "task_group_id": group["id"],
                    "title": rec["title"],
                    "description": rec.get("description"),
                    "form_code": rec.get("form_code"),
                    "status": "not_started",
                    "filing_year": filing_year,
                    "sort_order": idx,
                    "questionnaire_id": q["id"],
                    "auto_generated": True,
                    "source": "questionnaire",
                }
            ).execute()
            created += 1

    # Delete any auto-generated tasks that are no longer recommended
    obsolete_ids = [t["id"] for t in existing_tasks if t["id"] not in kept_ids]
    deleted = 0
    if obsolete_ids:
        db.table("tasks").delete().in_("id", obsolete_ids).execute()
        deleted = len(obsolete_ids)

    # ── Refresh form checklist ────────────────────────────────────────────────
    recommended_codes = _get_recommended_form_codes(q)

    forms_res = (
        db.table("forms_catalog")
        .select("*")
        .in_("form_code", list(recommended_codes))
        .execute()
    )
    catalog_forms = forms_res.data or []

    # Clear existing checklist for this user+year, then insert fresh
    db.table("user_form_checklist") \
        .delete() \
        .eq("user_id", user_id) \
        .eq("filing_year", filing_year) \
        .execute()

    checklist_rows = [
        {
            "user_id": user_id,
            "form_id": form["id"],
            "filing_year": filing_year,
            "status": "pending",
        }
        for form in catalog_forms
    ]

    checklist_count = 0
    if checklist_rows:
        inserted = db.table("user_form_checklist").insert(checklist_rows).execute()
        checklist_count = len(inserted.data or [])

    return SyncTasksResponse(
        created=created,
        updated=updated,
        deleted=deleted,
        checklist_count=checklist_count,
    )


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

    if "w2" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload W-2 (Wage and Tax Statement)",
            "description": "Reports wages paid and taxes withheld by your employer",
            "form_code": "W-2",
        })

    if "1099_nec" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload 1099-NEC (Nonemployee Compensation)",
            "description": "Reports freelance/self-employment income",
            "form_code": "1099-NEC",
        })

    if "1099_int" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload 1099-INT (Interest Income)",
            "description": "Reports interest earned from bank accounts",
            "form_code": "1099-INT",
        })

    if "1099_div" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload 1099-DIV (Dividends and Distributions)",
            "description": "Reports dividends from investments",
            "form_code": "1099-DIV",
        })

    if "investments" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload 1099-B (Broker Transactions)",
            "description": "Reports stock/crypto sale proceeds",
            "form_code": "1099-B",
        })

    if "1098_t" in income_sources:
        tasks.append({
            "group": "Tax Forms",
            "title": "Upload 1098-T (Tuition Statement)",
            "description": "Reports tuition paid for education credits (American Opportunity or Lifetime Learning)",
            "form_code": "1098-T",
        })

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