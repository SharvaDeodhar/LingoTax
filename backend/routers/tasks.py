"""
Task recommendations endpoint.
Maps questionnaire answers to recommended tax forms and task lists.

GET /tasks/recommendations – Returns forms + tasks based on user's questionnaire
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
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


# ─── Endpoint ─────────────────────────────────────────────────────────────────

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

    # Multi-state situation
    states_worked = q.get("states_worked") or []
    if len(states_worked) > 1:
        recommended_codes.add("State Return (multiple)")

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


class SyncTasksRequest(BaseModel):
    filing_year: int = 2024


class SyncTasksResponse(BaseModel):
    created: int
    updated: int
    deleted: int


@router.post("/sync_from_questionnaire", response_model=SyncTasksResponse)
async def sync_tasks_from_questionnaire(
    payload: SyncTasksRequest,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_user_supabase),
):
    """
    Materialize questionnaire-driven task recommendations into the tasks table.

    - Uses the same recommendation engine as /tasks/recommendations
    - Marks tasks as auto-generated and links them to the questionnaire row
    - Idempotent: re-running will update descriptions/order and prune obsolete
      auto-generated tasks without touching user-created tasks.
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
    recommended = _build_tasks(q)

    # Load task groups so we can map group name → id
    groups_res = db.table("task_groups").select("*").execute()
    groups_by_name = {g["name"]: g for g in (groups_res.data or [])}

    # Ensure all referenced groups exist (defensive for custom groups)
    missing_groups = {t["group"] for t in recommended} - set(groups_by_name.keys())
    if missing_groups:
        # Create any missing groups with a high sort_order so they appear last
        insert_rows = [
            {"name": name, "sort_order": 99} for name in sorted(missing_groups)
        ]
        if insert_rows:
            inserted = db.table("task_groups").insert(insert_rows).execute()
            for g in inserted.data or []:
                groups_by_name[g["name"]] = g

    # Existing auto-generated tasks for this year/user
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
    existing_by_key: dict[tuple[str, str], dict] = {}
    for t in existing_tasks:
        group = next(
            (g_name for g_name, g in groups_by_name.items() if g["id"] == t.get("task_group_id")),
            None,
        )
        if group:
            existing_by_key[(group, t["title"])] = t

    created = 0
    updated = 0
    kept_ids: set[str] = set()

    # Upsert recommended tasks
    for idx, rec in enumerate(recommended):
        group_name = rec["group"]
        group = groups_by_name.get(group_name)
        if not group:
            # Should not happen due to earlier seeding, but skip defensively
            continue

        key = (group_name, rec["title"])
        existing = existing_by_key.get(key)

        if existing:
            # Update description / sort_order if needed
            db.table("tasks").update(
                {
                    "description": rec.get("description"),
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
    obsolete_ids = [
        t["id"] for t in existing_tasks if t["id"] not in kept_ids
    ]
    deleted = 0
    if obsolete_ids:
        db.table("tasks").delete().in_("id", obsolete_ids).execute()
        deleted = len(obsolete_ids)

    return SyncTasksResponse(created=created, updated=updated, deleted=deleted)


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

    # Tax Forms group
    income_sources = q.get("income_sources") or []
    if income_sources:
        tasks.append(
            {
                "group": "Tax Forms",
                "title": "Collect all income documents",
                "description": "Expected: " + ", ".join(income_sources).replace("_", "-").upper(),
            }
        )

    if "1098_t" in income_sources:
        tasks.append(
            {
                "group": "Tax Forms",
                "title": "Get Form 1098-T from your school",
                "description": "Required to claim education credits (American Opportunity or Lifetime Learning)",
            }
        )

    if "1099_nec" in income_sources:
        tasks.append(
            {
                "group": "Work Forms",
                "title": "Track all business expenses for Schedule C",
                "description": "Home office, equipment, software, mileage — reduces self-employment tax",
            }
        )

    # Visa-specific
    visa = q.get("visa_type", "")
    if visa in FORM_8843_VISAS:
        tasks.append(
            {
                "group": "Tax Forms",
                "title": f"Prepare Form 8843 ({visa} visa)",
                "description": "Required for exempt individuals — must be filed even with zero income",
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
