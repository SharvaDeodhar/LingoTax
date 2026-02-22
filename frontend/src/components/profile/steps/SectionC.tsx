"use client";

import type { QuestionnaireMainData } from "../QuestionnaireForm";
import type { QuestionnaireDependent } from "@/types";
import { Field, RadioCards, YNS } from "./shared";

interface Props {
  data: QuestionnaireMainData;
  onChange: (field: string, value: unknown) => void;
  dependents: QuestionnaireDependent[];
  setDependents: (v: QuestionnaireDependent[]) => void;
}

const RELATIONSHIP_OPTIONS = [
  { value: "child",   label: "Child" },
  { value: "parent",  label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "other",   label: "Other" },
];

const ID_TYPE_OPTIONS = [
  { value: "ssn",             label: "Has SSN" },
  { value: "itin",            label: "Has ITIN" },
  { value: "applied_waiting", label: "Applied, waiting" },
  { value: "no",              label: "No ID yet" },
  { value: "not_sure",        label: "Not sure" },
];

const RESIDENCE_OPTIONS = [
  { value: "us",         label: "In the U.S." },
  { value: "outside_us", label: "Outside the U.S." },
  { value: "both",       label: "Both (part-year)" },
];

const isMarried = (s: string | null) => s === "married" || s === "separated";

export function SectionC({ data, onChange, dependents, setDependents }: Props) {
  const showSpouseQuestions = isMarried(data.marital_status);
  const showDependentRows = data.has_dependents === "yes";

  function addDependent() {
    setDependents([
      ...dependents,
      {
        full_name: null,
        relationship: null,
        date_of_birth: null,
        months_lived_with: null,
        id_type: null,
        is_full_time_student: null,
        provided_over_half_support: null,
        residence: null,
      },
    ]);
  }
  function removeDependent(i: number) {
    setDependents(dependents.filter((_, idx) => idx !== i));
  }
  function updateDependent(i: number, patch: Partial<QuestionnaireDependent>) {
    setDependents(dependents.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-900">
        Section C — Filing Status &amp; Family
      </h3>

      {/* Marital status */}
      <Field label="What was your marital status on December 31 of the tax year?">
        <RadioCards
          value={data.marital_status}
          onChange={(v) => onChange("marital_status", v)}
          options={[
            { value: "single",   label: "Single" },
            { value: "married",  label: "Married" },
            { value: "separated", label: "Legally separated" },
            { value: "divorced", label: "Divorced" },
            { value: "widowed",  label: "Widowed" },
            { value: "not_sure", label: "Not sure" },
          ]}
        />
      </Field>

      {/* Spouse location */}
      {showSpouseQuestions && (
        <Field label="Where did your spouse live during the tax year?">
          <RadioCards
            value={data.spouse_location}
            onChange={(v) => onChange("spouse_location", v)}
            options={[
              { value: "us",         label: "In the U.S. all year" },
              { value: "outside_us", label: "Outside the U.S." },
              { value: "part_year",  label: "Part of the year in U.S." },
              { value: "not_sure",   label: "Not sure" },
            ]}
          />
        </Field>
      )}

      {/* Spouse ID type */}
      {showSpouseQuestions && (
        <Field label="Does your spouse have a U.S. tax ID?">
          <RadioCards
            value={data.spouse_id_type}
            onChange={(v) => onChange("spouse_id_type", v)}
            options={[
              { value: "ssn",             label: "Yes — SSN" },
              { value: "itin",            label: "Yes — ITIN" },
              { value: "applied_waiting", label: "Applied, waiting" },
              { value: "no",              label: "No" },
              { value: "not_sure",        label: "Not sure" },
            ]}
          />
        </Field>
      )}

      {/* Has dependents */}
      <Field label="Do you have dependents (children or others you financially support) to claim?">
        <YNS
          value={data.has_dependents}
          onChange={(v) => onChange("has_dependents", v)}
          extraOption={{ value: "not_sure", label: "Not sure" }}
        />
      </Field>

      {/* Dependent rows */}
      {showDependentRows && (
        <Field label="Tell us about each dependent">
          <div className="space-y-4">
            {dependents.map((dep, i) => (
              <div key={i} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-700">Dependent {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeDependent(i)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Full name</p>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={dep.full_name ?? ""}
                      onChange={(e) => updateDependent(i, { full_name: e.target.value || null })}
                      className="input-text"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Date of birth</p>
                    <input
                      type="date"
                      value={dep.date_of_birth ?? ""}
                      onChange={(e) => updateDependent(i, { date_of_birth: e.target.value || null })}
                      className="input-text"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Relationship to you</p>
                  <div className="flex flex-wrap gap-2">
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs cursor-pointer transition-colors ${
                          dep.relationship === opt.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={dep.relationship === opt.value}
                          onChange={() => updateDependent(i, { relationship: opt.value })}
                          className="sr-only"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Months lived with you (0–12)</p>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={dep.months_lived_with ?? ""}
                    onChange={(e) =>
                      updateDependent(i, { months_lived_with: e.target.value ? Number(e.target.value) : null })
                    }
                    className="input-text"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tax ID</p>
                  <div className="flex flex-wrap gap-2">
                    {ID_TYPE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs cursor-pointer transition-colors ${
                          dep.id_type === opt.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={dep.id_type === opt.value}
                          onChange={() => updateDependent(i, { id_type: opt.value as QuestionnaireDependent["id_type"] })}
                          className="sr-only"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Where does this dependent live?</p>
                  <div className="flex flex-wrap gap-2">
                    {RESIDENCE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs cursor-pointer transition-colors ${
                          dep.residence === opt.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={dep.residence === opt.value}
                          onChange={() => updateDependent(i, { residence: opt.value as QuestionnaireDependent["residence"] })}
                          className="sr-only"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dep.is_full_time_student === true}
                      onChange={(e) =>
                        updateDependent(i, { is_full_time_student: e.target.checked ? true : null })
                      }
                      className="rounded"
                    />
                    Full-time student
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dep.provided_over_half_support === true}
                      onChange={(e) =>
                        updateDependent(i, { provided_over_half_support: e.target.checked ? true : null })
                      }
                      className="rounded"
                    />
                    I provided &gt;50% of their support
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addDependent}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add dependent
            </button>
          </div>
        </Field>
      )}
    </div>
  );
}
