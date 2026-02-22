"use client";

import { IMMIGRATION_STATUSES } from "@/lib/constants";
import type { QuestionnaireMainData } from "../QuestionnaireForm";
import type { ImmigrationHistoryRow } from "@/types";
import { Field, RadioCards, YNS, CheckboxGroup } from "./shared";

interface Props {
  data: QuestionnaireMainData;
  onChange: (field: string, value: unknown) => void;
  immigrationHistory: ImmigrationHistoryRow[];
  setImmigrationHistory: (v: ImmigrationHistoryRow[]) => void;
}

export function SectionB({ data, onChange, immigrationHistory, setImmigrationHistory }: Props) {
  const isNonCitizen = data.is_us_citizen === "no";
  const showImmigrationStatus = isNonCitizen && data.is_permanent_resident === "no";
  const hasOtherStatus = data.immigration_statuses.includes("Other");
  const showStatusChange = isNonCitizen;
  const showDays = data.is_us_citizen === "no";
  const showScholarshipForms = data.received_scholarship === "yes";

  function addHistoryRow() {
    setImmigrationHistory([
      ...immigrationHistory,
      { from_status: "", to_status: "", effective_date: null },
    ]);
  }
  function removeHistoryRow(i: number) {
    setImmigrationHistory(immigrationHistory.filter((_, idx) => idx !== i));
  }
  function updateHistoryRow(i: number, patch: Partial<ImmigrationHistoryRow>) {
    setImmigrationHistory(
      immigrationHistory.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-900">
        Section B — Immigration &amp; Residency
      </h3>

      {/* US Citizen */}
      <Field label="Are you a U.S. citizen?">
        <RadioCards
          value={data.is_us_citizen}
          onChange={(v) => onChange("is_us_citizen", v)}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no",  label: "No" },
          ]}
          inline
        />
      </Field>

      {/* Permanent resident */}
      {data.is_us_citizen === "no" && (
        <Field label="Are you a Lawful Permanent Resident (green card holder)?">
          <YNS
            value={data.is_permanent_resident}
            onChange={(v) => onChange("is_permanent_resident", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>
      )}

      {/* Immigration status multi-select */}
      {showImmigrationStatus && (
        <Field
          label="What is / was your immigration status during the tax year?"
          hint="Select all that apply."
        >
          <CheckboxGroup
            values={data.immigration_statuses}
            onChange={(v) => onChange("immigration_statuses", v)}
            options={IMMIGRATION_STATUSES as unknown as { value: string; label: string }[]}
          />
          {hasOtherStatus && (
            <input
              type="text"
              placeholder="Please describe your status"
              value={data.immigration_status_other ?? ""}
              onChange={(e) => onChange("immigration_status_other", e.target.value || null)}
              className="input-text mt-2"
            />
          )}
        </Field>
      )}

      {/* Status changed */}
      {showStatusChange && (
        <Field label="Did your immigration status change during the tax year?">
          <YNS
            value={data.status_changed}
            onChange={(v) => onChange("status_changed", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>
      )}

      {/* First US entry date */}
      {data.is_us_citizen === "no" && (
        <Field label="What was your first date of entry to the U.S.? (approximate is fine)">
          <input
            type="text"
            placeholder="e.g. August 2018 or 2018-08-22"
            value={data.first_entry_date ?? ""}
            onChange={(e) => onChange("first_entry_date", e.target.value || null)}
            className="input-text"
          />
        </Field>
      )}

      {/* Immigration history rows */}
      {data.status_changed === "yes" && (
        <Field
          label="List each status change (most recent first)"
          hint="Add one row per change."
        >
          <div className="space-y-3">
            {immigrationHistory.map((row, i) => (
              <div key={i} className="flex gap-2 items-start flex-wrap border rounded-lg p-3 bg-gray-50">
                <div className="flex-1 min-w-[130px] space-y-1">
                  <p className="text-xs text-muted-foreground">From status</p>
                  <input
                    type="text"
                    placeholder="e.g. F-1"
                    value={row.from_status}
                    onChange={(e) => updateHistoryRow(i, { from_status: e.target.value })}
                    className="input-text"
                  />
                </div>
                <div className="flex-1 min-w-[130px] space-y-1">
                  <p className="text-xs text-muted-foreground">To status</p>
                  <input
                    type="text"
                    placeholder="e.g. H-1B"
                    value={row.to_status}
                    onChange={(e) => updateHistoryRow(i, { to_status: e.target.value })}
                    className="input-text"
                  />
                </div>
                <div className="flex-1 min-w-[130px] space-y-1">
                  <p className="text-xs text-muted-foreground">Effective date (approx.)</p>
                  <input
                    type="text"
                    placeholder="e.g. Oct 2023"
                    value={row.effective_date ?? ""}
                    onChange={(e) => updateHistoryRow(i, { effective_date: e.target.value || null })}
                    className="input-text"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeHistoryRow(i)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-6"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addHistoryRow}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add status change
            </button>
          </div>
        </Field>
      )}

      {/* Days in US */}
      {showDays && (
        <>
          <Field label="How would you describe your count of days in the U.S. this year?">
            <RadioCards
              value={data.us_days_current_type}
              onChange={(v) => onChange("us_days_current_type", v)}
              options={[
                { value: "exact",    label: "I know the exact count" },
                { value: "estimate", label: "I can estimate" },
                { value: "not_sure", label: "I'm not sure" },
              ]}
            />
          </Field>

          {data.us_days_current_type !== "not_sure" && data.us_days_current_type !== null && (
            <Field label={`Days in the U.S. during ${data.filing_year}`}>
              <input
                type="number"
                min={0}
                max={366}
                value={data.us_days_current ?? ""}
                onChange={(e) => onChange("us_days_current", e.target.value ? Number(e.target.value) : null)}
                placeholder="e.g. 183"
                className="input-text"
              />
            </Field>
          )}

          <Field label={`Days in the U.S. during prior years (for the Substantial Presence Test)`}>
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <label className="text-xs text-muted-foreground w-20 shrink-0">{data.filing_year - 1}</label>
                <input
                  type="number"
                  min={0}
                  max={366}
                  value={data.us_days_year_minus1 ?? ""}
                  onChange={(e) => onChange("us_days_year_minus1", e.target.value ? Number(e.target.value) : null)}
                  placeholder="Days"
                  disabled={data.us_days_prior_not_sure}
                  className="input-text flex-1"
                />
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-xs text-muted-foreground w-20 shrink-0">{data.filing_year - 2}</label>
                <input
                  type="number"
                  min={0}
                  max={366}
                  value={data.us_days_year_minus2 ?? ""}
                  onChange={(e) => onChange("us_days_year_minus2", e.target.value ? Number(e.target.value) : null)}
                  placeholder="Days"
                  disabled={data.us_days_prior_not_sure}
                  className="input-text flex-1"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.us_days_prior_not_sure}
                  onChange={(e) => onChange("us_days_prior_not_sure", e.target.checked)}
                  className="rounded"
                />
                I don&apos;t know / not applicable
              </label>
            </div>
          </Field>
        </>
      )}

      {/* Exempt individual */}
      <Field
        label="Are you an exempt individual (e.g. diplomat, student on F/J/M/Q visa during exempt period)?"
        hint="F-1 students are typically exempt for their first 5 years in the U.S."
      >
        <YNS
          value={data.is_exempt_individual}
          onChange={(v) => onChange("is_exempt_individual", v)}
          extraOption={{ value: "not_sure", label: "Not sure" }}
        />
      </Field>

      {/* Scholarship */}
      <Field label="Did you receive a scholarship, fellowship, or grant during the tax year?">
        <YNS
          value={data.received_scholarship}
          onChange={(v) => onChange("received_scholarship", v)}
          extraOption={{ value: "not_sure", label: "Not sure" }}
        />
      </Field>

      {showScholarshipForms && (
        <Field label="Did you receive any school tax forms related to the scholarship (e.g. 1042-S, 1098-T)?">
          <YNS
            value={data.received_school_tax_forms}
            onChange={(v) => onChange("received_school_tax_forms", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>
      )}
    </div>
  );
}
