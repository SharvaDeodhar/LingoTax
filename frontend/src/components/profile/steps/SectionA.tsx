"use client";

import { US_STATES } from "@/lib/constants";
import type { QuestionnaireMainData } from "../QuestionnaireForm";
import type { StateResidencyRow } from "@/types";
import { Field, RadioCards, YNS } from "./shared";

interface Props {
  data: QuestionnaireMainData;
  onChange: (field: string, value: unknown) => void;
  stateResidency: StateResidencyRow[];
  setStateResidency: (v: StateResidencyRow[]) => void;
}

export function SectionA({ data, onChange, stateResidency, setStateResidency }: Props) {
  const showMultiStateDates = data.multi_state_lived === "yes";

  function addStateRow() {
    setStateResidency([...stateResidency, { state_code: "", date_from: null, date_to: null }]);
  }
  function removeStateRow(i: number) {
    setStateResidency(stateResidency.filter((_, idx) => idx !== i));
  }
  function updateStateRow(i: number, patch: Partial<StateResidencyRow>) {
    setStateResidency(stateResidency.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-900">
        Section A — Basic Identity &amp; Filing Setup
      </h3>

      {/* Filing year */}
      <Field label="What tax year are you filing for?">
        <select
          value={data.filing_year}
          onChange={(e) => onChange("filing_year", Number(e.target.value))}
          className="input-select"
        >
          {[2025, 2024, 2023, 2022].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </Field>

      {/* Country of residence */}
      <Field label="What is your current country of residence?">
        <div className="space-y-2">
          {["US", "Other"].map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg cursor-pointer text-sm transition-colors ${
                (opt === "US" ? data.country_of_residence === "US" : data.country_of_residence !== null && data.country_of_residence !== "US")
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                checked={opt === "US" ? data.country_of_residence === "US" : (data.country_of_residence !== null && data.country_of_residence !== "US")}
                onChange={() => onChange("country_of_residence", opt === "US" ? "US" : "")}
                className="sr-only"
              />
              <span className="w-3.5 h-3.5 rounded-full border-2 border-current flex items-center justify-center shrink-0">
                {(opt === "US" ? data.country_of_residence === "US" : (data.country_of_residence !== null && data.country_of_residence !== "US")) && (
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                )}
              </span>
              {opt}
            </label>
          ))}
          {data.country_of_residence !== null && data.country_of_residence !== "US" && (
            <input
              type="text"
              placeholder="Enter country"
              value={data.country_of_residence}
              onChange={(e) => onChange("country_of_residence", e.target.value)}
              className="input-text mt-1"
            />
          )}
        </div>
      </Field>

      {/* Multi-state */}
      <Field label="Did you live in more than one U.S. state during the tax year?">
        <YNS value={data.multi_state_lived} onChange={(v) => onChange("multi_state_lived", v)} extraOption={{ value: "not_sure", label: "Not sure" }} />
      </Field>

      {/* State residency rows */}
      <Field
        label="Which U.S. state(s) did you live in? (add a row per state)"
        hint={showMultiStateDates ? "Add each state with the dates you lived there." : undefined}
      >
        <div className="space-y-2">
          {stateResidency.map((row, i) => (
            <div key={i} className="flex gap-2 items-start flex-wrap">
              <select
                value={row.state_code}
                onChange={(e) => updateStateRow(i, { state_code: e.target.value })}
                className="input-select flex-1 min-w-[120px]"
              >
                <option value="">— State —</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                ))}
              </select>
              {showMultiStateDates && (
                <>
                  <input
                    type="date"
                    placeholder="From"
                    value={row.date_from ?? ""}
                    onChange={(e) => updateStateRow(i, { date_from: e.target.value || null })}
                    className="input-text flex-1 min-w-[130px]"
                  />
                  <input
                    type="date"
                    placeholder="To (leave blank if current)"
                    value={row.date_to ?? ""}
                    onChange={(e) => updateStateRow(i, { date_to: e.target.value || null })}
                    className="input-text flex-1 min-w-[130px]"
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => removeStateRow(i)}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-2"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addStateRow}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add state
          </button>
        </div>
      </Field>

      {/* Age */}
      <Field label="What is your age on December 31 of the tax year?">
        <input
          type="number"
          min={1}
          max={120}
          value={data.age_on_dec31 ?? ""}
          onChange={(e) => onChange("age_on_dec31", e.target.value ? Number(e.target.value) : null)}
          placeholder="e.g. 29"
          className="input-text"
        />
      </Field>

      {/* SSN */}
      <Field label="Do you have a Social Security Number (SSN)?">
        <RadioCards
          value={data.ssn_status}
          onChange={(v) => onChange("ssn_status", v)}
          options={[
            { value: "yes",             label: "Yes" },
            { value: "no",              label: "No" },
            { value: "applied_waiting", label: "Applied, waiting" },
            { value: "prefer_not_to_say", label: "Prefer not to say" },
          ]}
        />
      </Field>

      {/* ITIN */}
      <Field label="Do you have an ITIN (Individual Taxpayer Identification Number)?">
        <RadioCards
          value={data.itin_status}
          onChange={(v) => onChange("itin_status", v)}
          options={[
            { value: "yes",             label: "Yes" },
            { value: "no",              label: "No" },
            { value: "applied_waiting", label: "Applied, waiting" },
            { value: "not_sure",        label: "Not sure what this is" },
          ]}
        />
      </Field>

      {/* Filing for */}
      <Field label="Are you filing for yourself only, or also for a spouse / family?">
        <RadioCards
          value={data.filing_for}
          onChange={(v) => onChange("filing_for", v)}
          options={[
            { value: "self",                    label: "Just me" },
            { value: "self_spouse",             label: "Me and spouse" },
            { value: "self_dependents",         label: "Me and dependents" },
            { value: "self_spouse_dependents",  label: "Me, spouse, and dependents" },
            { value: "not_sure",                label: "Not sure" },
          ]}
        />
      </Field>
    </div>
  );
}
