"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CURRENT_FILING_YEAR } from "@/lib/constants";
import { PersonalStep } from "./steps/PersonalStep";
import { ResidencyStep } from "./steps/ResidencyStep";
import { IncomeStep } from "./steps/IncomeStep";
import { StatesStep } from "./steps/StatesStep";
import type { Questionnaire } from "@/types";

const STEPS = ["Personal", "Residency", "Income", "States"] as const;

interface QuestionnaireFormProps {
  userId: string;
  initialData?: Partial<Questionnaire>;
}

export function QuestionnaireForm({ userId, initialData }: QuestionnaireFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState({
    filing_year: initialData?.filing_year ?? CURRENT_FILING_YEAR,
    filing_status: initialData?.filing_status ?? null,
    residency_status: initialData?.residency_status ?? null,
    visa_type: initialData?.visa_type ?? null,
    has_ssn: initialData?.has_ssn ?? null,
    has_itin: initialData?.has_itin ?? null,
    num_dependents: initialData?.num_dependents ?? 0,
    states_lived: initialData?.states_lived ?? [],
    states_worked: initialData?.states_worked ?? [],
    income_sources: initialData?.income_sources ?? [],
  });

  const supabase = getSupabaseBrowserClient();

  function handleChange(field: string, value: unknown) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("questionnaires")
      .upsert(
        { user_id: userId, ...data },
        { onConflict: "user_id,filing_year" }
      );

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="max-w-xl">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((name, i) => (
          <div key={name} className="flex items-center gap-1 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step
                  ? "bg-blue-600 text-white"
                  : i === step
                  ? "bg-blue-100 text-blue-700 border-2 border-blue-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs hidden sm:inline ${
                i === step ? "text-blue-700 font-medium" : "text-muted-foreground"
              }`}
            >
              {name}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 ${i < step ? "bg-blue-600" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && <PersonalStep data={data} onChange={handleChange} />}
      {step === 1 && <ResidencyStep data={data} onChange={handleChange} />}
      {step === 2 && <IncomeStep data={data} onChange={handleChange} />}
      {step === 3 && <StatesStep data={data} onChange={handleChange} />}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Navigation */}
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
    </div>
  );
}
