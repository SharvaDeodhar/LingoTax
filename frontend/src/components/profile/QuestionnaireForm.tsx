"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CURRENT_FILING_YEAR } from "@/lib/constants";
import { syncTasksFromQuestionnaire } from "@/lib/api/fastapi";
import { SectionA } from "./steps/SectionA";
import { SectionB } from "./steps/SectionB";
import { SectionC } from "./steps/SectionC";
import { SectionD } from "./steps/SectionD";
import { SectionE } from "./steps/SectionE";
import { SectionF } from "./steps/SectionF";
import { SectionG } from "./steps/SectionG";
import { SectionH } from "./steps/SectionH";
import { SectionI } from "./steps/SectionI";
import type {
  Questionnaire,
  QuestionnaireDependent,
  ImmigrationHistoryRow,
  StateResidencyRow,
  D5IncomeDetail,
} from "@/types";

const STEPS = [
  { key: "A", label: "Identity" },
  { key: "B", label: "Immigration" },
  { key: "C", label: "Family" },
  { key: "D", label: "Income" },
  { key: "E", label: "Foreign" },
  { key: "F", label: "Health" },
  { key: "G", label: "Deductions" },
  { key: "H", label: "Documents" },
  { key: "I", label: "History" },
] as const;

export type QuestionnaireMainData = Omit<
  Questionnaire,
  "id" | "user_id" | "created_at" | "updated_at"
>;

function buildInitialData(init?: Partial<Questionnaire>): QuestionnaireMainData {
  return {
    filing_year: init?.filing_year ?? CURRENT_FILING_YEAR,
    questionnaire_version: 2,
    filing_status: init?.filing_status ?? null,
    residency_status: init?.residency_status ?? null,
    visa_type: init?.visa_type ?? null,
    has_ssn: init?.has_ssn ?? null,
    has_itin: init?.has_itin ?? null,
    num_dependents: init?.num_dependents ?? 0,
    states_lived: init?.states_lived ?? [],
    states_worked: init?.states_worked ?? [],
    income_sources: init?.income_sources ?? [],
    notes: init?.notes ?? null,
    country_of_residence: init?.country_of_residence ?? null,
    multi_state_lived: init?.multi_state_lived ?? null,
    age_on_dec31: init?.age_on_dec31 ?? null,
    ssn_status: init?.ssn_status ?? null,
    itin_status: init?.itin_status ?? null,
    filing_for: init?.filing_for ?? null,
    is_us_citizen: init?.is_us_citizen ?? null,
    is_permanent_resident: init?.is_permanent_resident ?? null,
    immigration_statuses: init?.immigration_statuses ?? [],
    immigration_status_other: init?.immigration_status_other ?? null,
    status_changed: init?.status_changed ?? null,
    first_entry_date: init?.first_entry_date ?? null,
    us_days_current_type: init?.us_days_current_type ?? null,
    us_days_current: init?.us_days_current ?? null,
    us_days_year_minus1: init?.us_days_year_minus1 ?? null,
    us_days_year_minus2: init?.us_days_year_minus2 ?? null,
    us_days_prior_not_sure: init?.us_days_prior_not_sure ?? false,
    is_exempt_individual: init?.is_exempt_individual ?? null,
    received_scholarship: init?.received_scholarship ?? null,
    received_school_tax_forms: init?.received_school_tax_forms ?? null,
    marital_status: init?.marital_status ?? null,
    spouse_location: init?.spouse_location ?? null,
    spouse_id_type: init?.spouse_id_type ?? null,
    has_dependents: init?.has_dependents ?? null,
    employee_wages: init?.employee_wages ?? null,
    received_w2: init?.received_w2 ?? null,
    num_employers: init?.num_employers ?? null,
    worked_multi_state: init?.worked_multi_state ?? null,
    freelance_income: init?.freelance_income ?? null,
    received_1099: init?.received_1099 ?? null,
    has_business_expenses: init?.has_business_expenses ?? null,
    used_car_for_work: init?.used_car_for_work ?? null,
    earned_bank_interest: init?.earned_bank_interest ?? null,
    has_investments: init?.has_investments ?? null,
    sold_investments: init?.sold_investments ?? null,
    received_broker_forms: init?.received_broker_forms ?? null,
    was_student: init?.was_student ?? null,
    paid_tuition: init?.paid_tuition ?? null,
    received_1098t: init?.received_1098t ?? null,
    taxable_scholarship_inc: init?.taxable_scholarship_inc ?? null,
    foreign_bank_accounts: init?.foreign_bank_accounts ?? null,
    multi_country_accounts: init?.multi_country_accounts ?? null,
    foreign_accounts_value: init?.foreign_accounts_value ?? null,
    foreign_income: init?.foreign_income ?? null,
    owns_foreign_company: init?.owns_foreign_company ?? null,
    received_foreign_family_money: init?.received_foreign_family_money ?? null,
    foreign_family_money_type: init?.foreign_family_money_type ?? null,
    paid_foreign_taxes: init?.paid_foreign_taxes ?? null,
    filing_foreign_taxes: init?.filing_foreign_taxes ?? null,
    health_coverage: init?.health_coverage ?? null,
    marketplace_insurance: init?.marketplace_insurance ?? null,
    received_1095a: init?.received_1095a ?? null,
    life_events: init?.life_events ?? [],
    deduct_tuition_fees: init?.deduct_tuition_fees ?? null,
    deduct_student_loan_int: init?.deduct_student_loan_int ?? null,
    claimed_as_dependent: init?.claimed_as_dependent ?? null,
    paid_childcare: init?.paid_childcare ?? null,
    bought_work_supplies: init?.bought_work_supplies ?? null,
    paid_biz_comms: init?.paid_biz_comms ?? null,
    has_home_office: init?.has_home_office ?? null,
    paid_rent: init?.paid_rent ?? null,
    paid_mortgage: init?.paid_mortgage ?? null,
    made_donations: init?.made_donations ?? null,
    paid_state_local_taxes: init?.paid_state_local_taxes ?? null,
    contributed_hsa: init?.contributed_hsa ?? null,
    withdrew_hsa: init?.withdrew_hsa ?? null,
    large_medical_expenses: init?.large_medical_expenses ?? null,
    contributed_ira: init?.contributed_ira ?? null,
    owned_documents: init?.owned_documents ?? [],
    waiting_for_forms: init?.waiting_for_forms ?? null,
    lost_forms: init?.lost_forms ?? null,
    can_contact_issuer: init?.can_contact_issuer ?? null,
    filed_us_taxes: init?.filed_us_taxes ?? null,
    first_filed_year: init?.first_filed_year ?? null,
    has_prior_return: init?.has_prior_return ?? null,
    prior_filing_type: init?.prior_filing_type ?? null,
    received_irs_letter: init?.received_irs_letter ?? null,
  };
}

interface QuestionnaireFormProps {
  userId: string;
  initialData?: Partial<Questionnaire>;
  initialDependents?: QuestionnaireDependent[];
  initialImmigrationHistory?: ImmigrationHistoryRow[];
  initialStateResidency?: StateResidencyRow[];
  initialD5Income?: D5IncomeDetail[];
}

export function QuestionnaireForm({
  userId,
  initialData,
  initialDependents = [],
  initialImmigrationHistory = [],
  initialStateResidency = [],
  initialD5Income = [],
}: QuestionnaireFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<QuestionnaireMainData>(() =>
    buildInitialData(initialData)
  );
  const [dependents, setDependents] =
    useState<QuestionnaireDependent[]>(initialDependents);
  const [immigrationHistory, setImmigrationHistory] =
    useState<ImmigrationHistoryRow[]>(initialImmigrationHistory);
  const [stateResidency, setStateResidency] =
    useState<StateResidencyRow[]>(initialStateResidency);
  const [d5Income, setD5Income] = useState<D5IncomeDetail[]>(initialD5Income);

  const supabase = getSupabaseBrowserClient();

  function handleChange(field: string, value: unknown) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    // Keep legacy fields in sync so tasks.py continues to work
    const syncedData: QuestionnaireMainData = {
      ...data,
      has_ssn:
        data.ssn_status === "yes"
          ? true
          : data.ssn_status === "no"
          ? false
          : data.has_ssn,
      has_itin:
        data.itin_status === "yes"
          ? true
          : data.itin_status === "no"
          ? false
          : data.has_itin,
      num_dependents:
        dependents.length > 0 ? dependents.length : data.num_dependents,
      states_lived:
        stateResidency.length > 0
          ? Array.from(new Set(stateResidency.map((r) => r.state_code)))
          : data.states_lived,
    };

    // Ensure the profiles row exists — guards against trigger not firing at sign-up
    await supabase.from("profiles").upsert(
      { user_id: userId },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

    // Check if a questionnaire already exists for this user/year
    const { data: existing } = await supabase
      .from("questionnaires")
      .select("id")
      .eq("user_id", userId)
      .eq("filing_year", syncedData.filing_year)
      .maybeSingle();

    let qId: string;

    if (existing?.id) {
      // Row exists — update it
      const { error: updateErr } = await supabase
        .from("questionnaires")
        .update(syncedData)
        .eq("id", existing.id);

      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }
      qId = existing.id;
    } else {
      // No row yet — insert
      const { data: inserted, error: insertErr } = await supabase
        .from("questionnaires")
        .insert({ user_id: userId, ...syncedData })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        setError(insertErr?.message ?? "Failed to save.");
        setSaving(false);
        return;
      }
      qId = inserted.id;
    }

    await Promise.all([
      supabase
        .from("questionnaire_dependents")
        .delete()
        .eq("questionnaire_id", qId),
      supabase
        .from("questionnaire_immigration_history")
        .delete()
        .eq("questionnaire_id", qId),
      supabase
        .from("questionnaire_state_residency")
        .delete()
        .eq("questionnaire_id", qId),
      supabase
        .from("questionnaire_d5_income")
        .delete()
        .eq("questionnaire_id", qId),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inserts: PromiseLike<any>[] = [];

    if (dependents.length > 0) {
      inserts.push(
        supabase
          .from("questionnaire_dependents")
          .insert(
            dependents.map((d, i) => ({
              ...d,
              id: undefined,
              questionnaire_id: qId,
              user_id: userId,
              sort_order: i,
            }))
          )
          .then(() => null)
      );
    }

    if (immigrationHistory.length > 0) {
      inserts.push(
        supabase
          .from("questionnaire_immigration_history")
          .insert(
            immigrationHistory.map((r, i) => ({
              ...r,
              id: undefined,
              questionnaire_id: qId,
              user_id: userId,
              sort_order: i,
            }))
          )
          .then(() => null)
      );
    }

    if (stateResidency.length > 0) {
      inserts.push(
        supabase
          .from("questionnaire_state_residency")
          .insert(
            stateResidency.map((r, i) => ({
              ...r,
              id: undefined,
              questionnaire_id: qId,
              user_id: userId,
              sort_order: i,
            }))
          )
          .then(() => null)
      );
    }

    const d5Rows = d5Income.filter((d) => d.flag !== null);
    if (d5Rows.length > 0) {
      inserts.push(
        supabase
          .from("questionnaire_d5_income")
          .insert(d5Rows.map((d) => ({ ...d, questionnaire_id: qId, user_id: userId })))
          .then(() => null)
      );
    }

    await Promise.all(inserts);

    // After successfully saving the questionnaire, generate/update
    // the personalized dashboard task list from these answers.
    // NOTE: If your API wrapper expects an object payload, change this call to:
    //   await syncTasksFromQuestionnaire({ filing_year: syncedData.filing_year });
    try {
      await syncTasksFromQuestionnaire(syncedData.filing_year);
    } catch (err) {
      // Non-fatal: if task sync fails, the user can still use the app;
      // the dashboard will simply not be auto-populated for now.
      console.error("Failed to sync tasks from questionnaire", err);
    }

    router.push("/dashboard");
  }

  const isLastStep = step === STEPS.length - 1;

  const sectionProps = {
    data,
    onChange: handleChange,
    dependents,
    setDependents,
    immigrationHistory,
    setImmigrationHistory,
    stateResidency,
    setStateResidency,
    d5Income,
    setD5Income,
  };

  return (
    <div className="max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-0.5 mb-8 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setStep(i)}
              className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step
                    ? "bg-blue-600 text-white"
                    : i === step
                    ? "bg-blue-100 border-2 border-blue-600 text-blue-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {s.key}
              </div>
              <span
                className={`text-[10px] hidden sm:block ${
                  i === step ? "text-blue-700 font-medium" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`w-3 h-0.5 mb-3 ${
                  i < step ? "bg-blue-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {step === 0 && <SectionA {...sectionProps} />}
      {step === 1 && <SectionB {...sectionProps} />}
      {step === 2 && <SectionC {...sectionProps} />}
      {step === 3 && <SectionD {...sectionProps} />}
      {step === 4 && <SectionE {...sectionProps} />}
      {step === 5 && <SectionF {...sectionProps} />}
      {step === 6 && <SectionG {...sectionProps} />}
      {step === 7 && <SectionH {...sectionProps} />}
      {step === 8 && <SectionI {...sectionProps} />}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        )}
        {!isLastStep ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        You can navigate between sections freely. Progress saves only when you
        click &ldquo;Save profile&rdquo;.
      </p>
    </div>
  );
}