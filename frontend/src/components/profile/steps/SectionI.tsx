"use client";

import type { QuestionnaireMainData } from "../QuestionnaireForm";
import { Field, RadioCards, YNS } from "./shared";

interface Props {
  data: QuestionnaireMainData;
  onChange: (field: string, value: unknown) => void;
}

export function SectionI({ data, onChange }: Props) {
  const hasFiled = data.filed_us_taxes === "yes";

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-900">
        Section I — Prior Filing History
      </h3>

      {/* Has filed US taxes */}
      <Field label="Have you ever filed a U.S. federal tax return before?">
        <YNS
          value={data.filed_us_taxes}
          onChange={(v) => onChange("filed_us_taxes", v)}
          extraOption={{ value: "not_sure", label: "Not sure" }}
        />
      </Field>

      {hasFiled && (
        <>
          {/* First filed year */}
          <Field label="What year did you first file a U.S. tax return?">
            <input
              type="number"
              min={1990}
              max={data.filing_year}
              placeholder="e.g. 2020"
              value={data.first_filed_year ?? ""}
              onChange={(e) =>
                onChange("first_filed_year", e.target.value ? Number(e.target.value) : null)
              }
              className="input-text"
            />
          </Field>

          {/* Has prior return */}
          <Field label="Do you have a copy of your most recent tax return?">
            <YNS
              value={data.has_prior_return}
              onChange={(v) => onChange("has_prior_return", v)}
              extraOption={{ value: "not_sure", label: "Not sure" }}
            />
          </Field>

          {/* Prior filing type */}
          <Field label="Was your most recent return filed as a resident or nonresident?">
            <RadioCards
              value={data.prior_filing_type}
              onChange={(v) => onChange("prior_filing_type", v)}
              options={[
                { value: "resident",    label: "Resident (Form 1040)" },
                { value: "nonresident", label: "Nonresident (Form 1040-NR)" },
                { value: "not_sure",    label: "Not sure" },
                { value: "dont_know",   label: "I don't know what that means" },
              ]}
            />
          </Field>
        </>
      )}

      {/* IRS letter */}
      <Field
        label="Have you received any letters or notices from the IRS or a state tax authority in the past year?"
        hint="Even if you filed on time, you may have received a notice about a discrepancy, balance due, or refund."
      >
        <YNS
          value={data.received_irs_letter}
          onChange={(v) => onChange("received_irs_letter", v)}
          extraOption={{ value: "not_sure", label: "Not sure" }}
        />
      </Field>
    </div>
  );
}
