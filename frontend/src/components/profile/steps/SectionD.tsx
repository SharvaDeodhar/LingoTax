"use client";

import { D5_INCOME_SOURCES } from "@/lib/constants";
import type { QuestionnaireMainData } from "../QuestionnaireForm";
import type { D5IncomeDetail, YnsAnswer } from "@/types";
import { Field, RadioCards, YNS } from "./shared";

interface Props {
  data: QuestionnaireMainData;
  onChange: (field: string, value: unknown) => void;
  d5Income: D5IncomeDetail[];
  setD5Income: (v: D5IncomeDetail[]) => void;
}

function getD5Row(d5Income: D5IncomeDetail[], source: string): D5IncomeDetail {
  return (
    d5Income.find((r) => r.income_source === source) ?? {
      income_source: source,
      flag: null,
      approximate_amount: null,
      country_source: null,
      received_document: null,
      document_name: null,
      can_upload: null,
    }
  );
}

export function SectionD({ data, onChange, d5Income, setD5Income }: Props) {
  const showW2Follow = data.employee_wages === "yes";
  const showFreelanceFollow = data.freelance_income === "yes";
  const showInvestmentsFollow = data.has_investments === "yes";
  const showStudentFollow = data.was_student === "yes";

  function updateD5(source: string, patch: Partial<D5IncomeDetail>) {
    const existing = d5Income.find((r) => r.income_source === source);
    if (existing) {
      setD5Income(d5Income.map((r) => (r.income_source === source ? { ...r, ...patch } : r)));
    } else {
      setD5Income([...d5Income, { income_source: source, flag: null, approximate_amount: null, country_source: null, received_document: null, document_name: null, can_upload: null, ...patch }]);
    }
  }

  return (
    <div className="space-y-8">
      <h3 className="text-base font-semibold text-gray-900">
        Section D — Employment &amp; Income
      </h3>

      {/* D1 — Employee wages */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">D1 — Employee Wages</h4>

        <Field label="Did you receive wages from an employer (W-2 income)?">
          <YNS
            value={data.employee_wages}
            onChange={(v) => onChange("employee_wages", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        {showW2Follow && (
          <>
            <Field label="Did you receive a W-2 form from your employer?">
              <RadioCards
                value={data.received_w2}
                onChange={(v) => onChange("received_w2", v)}
                options={[
                  { value: "yes",      label: "Yes" },
                  { value: "no",       label: "No / not yet" },
                  { value: "not_sure", label: "Not sure" },
                  { value: "lost",     label: "Lost it" },
                ]}
              />
            </Field>

            <Field label="How many employers did you have during the tax year?">
              <RadioCards
                value={data.num_employers}
                onChange={(v) => onChange("num_employers", v)}
                options={[
                  { value: "1",        label: "1" },
                  { value: "2_3",      label: "2–3" },
                  { value: "4_plus",   label: "4 or more" },
                  { value: "not_sure", label: "Not sure" },
                ]}
                inline
              />
            </Field>

            <Field label="Did you work in more than one U.S. state for that employer?">
              <YNS
                value={data.worked_multi_state}
                onChange={(v) => onChange("worked_multi_state", v)}
                extraOption={{ value: "not_sure", label: "Not sure" }}
              />
            </Field>
          </>
        )}
      </div>

      {/* D2 — Freelance / gig */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">D2 — Freelance / Gig Income</h4>

        <Field label="Did you have any freelance, gig, or self-employment income?">
          <YNS
            value={data.freelance_income}
            onChange={(v) => onChange("freelance_income", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        {showFreelanceFollow && (
          <>
            <Field label="Did you receive a 1099-NEC, 1099-K, or 1099-MISC form?">
              <YNS
                value={data.received_1099}
                onChange={(v) => onChange("received_1099", v)}
                extraOption={{ value: "not_sure", label: "Not sure" }}
              />
            </Field>

            <Field label="Did you have any business expenses to deduct (e.g. software, home office, travel)?">
              <YNS
                value={data.has_business_expenses}
                onChange={(v) => onChange("has_business_expenses", v)}
                extraOption={{ value: "not_sure", label: "Not sure" }}
              />
            </Field>

            {data.has_business_expenses === "yes" && (
              <Field label="Did you use a personal vehicle for work?">
                <RadioCards
                  value={data.used_car_for_work === null ? null : data.used_car_for_work ? "yes" : "no"}
                  onChange={(v) => onChange("used_car_for_work", v === "yes")}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no",  label: "No" },
                  ]}
                  inline
                />
              </Field>
            )}
          </>
        )}
      </div>

      {/* D3 — Investment income */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">D3 — Interest &amp; Investment Income</h4>

        <Field label="Did you earn interest from a U.S. bank or savings account?">
          <YNS
            value={data.earned_bank_interest}
            onChange={(v) => onChange("earned_bank_interest", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        <Field label="Did you own any investments (stocks, ETFs, mutual funds, crypto, etc.)?">
          <YNS
            value={data.has_investments}
            onChange={(v) => onChange("has_investments", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        {showInvestmentsFollow && (
          <>
            <Field label="Did you sell any investments during the tax year?">
              <YNS
                value={data.sold_investments}
                onChange={(v) => onChange("sold_investments", v)}
                extraOption={{ value: "not_sure", label: "Not sure" }}
              />
            </Field>

            {data.sold_investments === "yes" && (
              <Field label="Did you receive a 1099-B or brokerage statement from your broker?">
                <YNS
                  value={data.received_broker_forms}
                  onChange={(v) => onChange("received_broker_forms", v)}
                  extraOption={{ value: "not_sure", label: "Not sure" }}
                />
              </Field>
            )}
          </>
        )}
      </div>

      {/* D4 — Education income */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">D4 — Education Income</h4>

        <Field label="Were you a student during the tax year?">
          <RadioCards
            value={data.was_student}
            onChange={(v) => onChange("was_student", v)}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no",  label: "No" },
            ]}
            inline
          />
        </Field>

        {showStudentFollow && (
          <>
            <Field label="Did you pay tuition or qualified education expenses?">
              <YNS
                value={data.paid_tuition}
                onChange={(v) => onChange("paid_tuition", v)}
                extraOption={{ value: "not_sure", label: "Not sure" }}
              />
            </Field>

            <Field label="Did you receive a 1098-T (Tuition Statement) from your school?">
              <YNS
                value={data.received_1098t}
                onChange={(v) => onChange("received_1098t", v)}
                extraOption={{ value: "not_sure", label: "Not sure" }}
              />
            </Field>

            <Field label="Did any part of your scholarship/fellowship become taxable income (used for non-tuition expenses)?">
              <YNS
                value={data.taxable_scholarship_inc}
                onChange={(v) => onChange("taxable_scholarship_inc", v)}
                extraOption={{ value: "not_sure", label: "Not sure" }}
              />
            </Field>
          </>
        )}
      </div>

      {/* D5 — Other income sources */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">D5 — Other Income Sources</h4>
        <p className="text-xs text-muted-foreground">
          For each income type below, indicate whether you received it. We&apos;ll ask follow-up questions for any &quot;Yes&quot; answers.
        </p>

        {D5_INCOME_SOURCES.map((src) => {
          const row = getD5Row(d5Income, src.value);
          return (
            <div key={src.value} className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <Field label={src.label}>
                <YNS
                  value={row.flag}
                  onChange={(v) => updateD5(src.value, { flag: v as YnsAnswer })}
                  extraOption={{ value: "not_sure", label: "Not sure" }}
                />
              </Field>

              {row.flag === "yes" && (
                <div className="space-y-3 pl-3 border-l-2 border-blue-200">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Approximate amount (USD)</p>
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. 5000"
                      value={row.approximate_amount ?? ""}
                      onChange={(e) =>
                        updateD5(src.value, { approximate_amount: e.target.value ? Number(e.target.value) : null })
                      }
                      className="input-text"
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Country where income was earned (leave blank if U.S.)</p>
                    <input
                      type="text"
                      placeholder="e.g. India, Canada"
                      value={row.country_source ?? ""}
                      onChange={(e) =>
                        updateD5(src.value, { country_source: e.target.value || null })
                      }
                      className="input-text"
                    />
                  </div>

                  <Field label="Did you receive a tax document for this income?">
                    <YNS
                      value={row.received_document}
                      onChange={(v) => updateD5(src.value, { received_document: v as YnsAnswer })}
                      extraOption={{ value: "not_sure", label: "Not sure" }}
                    />
                  </Field>

                  {row.received_document === "yes" && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Document name (e.g. 1099-G, SSA-1099)</p>
                      <input
                        type="text"
                        placeholder="e.g. 1099-G"
                        value={row.document_name ?? ""}
                        onChange={(e) =>
                          updateD5(src.value, { document_name: e.target.value || null })
                        }
                        className="input-text"
                      />
                    </div>
                  )}

                  <Field label="Can you upload a copy of this document?">
                    <RadioCards
                      value={row.can_upload}
                      onChange={(v) => updateD5(src.value, { can_upload: v as D5IncomeDetail["can_upload"] })}
                      options={[
                        { value: "yes",   label: "Yes" },
                        { value: "no",    label: "No" },
                        { value: "later", label: "Maybe later" },
                      ]}
                      inline
                    />
                  </Field>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
