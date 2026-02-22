"use client";

import type { QuestionnaireMainData } from "../QuestionnaireForm";
import { Field, RadioCards, YNS } from "./shared";

interface Props {
  data: QuestionnaireMainData;
  onChange: (field: string, value: unknown) => void;
}

export function SectionE({ data, onChange }: Props) {
  const showForeignBankFollow = data.foreign_bank_accounts === "yes";
  const showForeignFamilyFollow = data.received_foreign_family_money === "yes";
  const showFilingForeignTaxes = data.paid_foreign_taxes === "yes";

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-900">
        Section E — Foreign Assets &amp; International
      </h3>

      {/* Foreign bank accounts */}
      <Field label="Do you have any bank or financial accounts outside the U.S.?">
        <YNS
          value={data.foreign_bank_accounts}
          onChange={(v) => onChange("foreign_bank_accounts", v)}
          extraOption={{ value: "not_sure", label: "Not sure" }}
        />
      </Field>

      {showForeignBankFollow && (
        <>
          <Field label="Do you have accounts in more than one country?">
            <RadioCards
              value={data.multi_country_accounts === null ? null : data.multi_country_accounts ? "yes" : "no"}
              onChange={(v) => onChange("multi_country_accounts", v === "yes")}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no",  label: "No" },
              ]}
              inline
            />
          </Field>

          <Field
            label="Did the total value of all foreign accounts exceed $10,000 at any point during the year?"
            hint="This determines if you need to file an FBAR (FinCEN 114)."
          >
            <RadioCards
              value={data.foreign_accounts_value}
              onChange={(v) => onChange("foreign_accounts_value", v)}
              options={[
                { value: "yes",        label: "Yes" },
                { value: "no",         label: "No" },
                { value: "not_sure",   label: "Not sure" },
                { value: "dont_know",  label: "I don't know the total" },
              ]}
            />
          </Field>
        </>
      )}

      {/* Foreign income */}
      <Field label="Did you earn income from foreign sources (salary, business, investments outside the U.S.)?">
        <YNS
          value={data.foreign_income}
          onChange={(v) => onChange("foreign_income", v)}
          extraOption={{ value: "not_sure", label: "Not sure" }}
        />
      </Field>

      {/* Foreign company ownership */}
      <Field
        label="Do you own or have a financial interest in a foreign corporation, partnership, or trust?"
        hint="Includes owning shares in a foreign company."
      >
        <YNS
          value={data.owns_foreign_company}
          onChange={(v) => onChange("owns_foreign_company", v)}
          extraOption={{ value: "not_sure", label: "Not sure" }}
        />
      </Field>

      {/* Foreign family money */}
      <Field label="Did you receive money from family members or relatives outside the U.S. during the year?">
        <YNS
          value={data.received_foreign_family_money}
          onChange={(v) => onChange("received_foreign_family_money", v)}
          extraOption={{ value: "not_sure", label: "Not sure" }}
        />
      </Field>

      {showForeignFamilyFollow && (
        <Field label="What was the nature of that money?">
          <RadioCards
            value={data.foreign_family_money_type}
            onChange={(v) => onChange("foreign_family_money_type", v)}
            options={[
              { value: "gift",    label: "Gift" },
              { value: "income",  label: "Payments for work / income" },
              { value: "support", label: "Financial support / living expenses" },
            ]}
          />
        </Field>
      )}

      {/* Foreign taxes paid */}
      <Field label="Did you pay taxes to a foreign government on any income?">
        <YNS
          value={data.paid_foreign_taxes}
          onChange={(v) => onChange("paid_foreign_taxes", v)}
          extraOption={{ value: "not_sure", label: "Not sure" }}
        />
      </Field>

      {showFilingForeignTaxes && (
        <Field label="Are you also filing a tax return in that foreign country this year?">
          <YNS
            value={data.filing_foreign_taxes}
            onChange={(v) => onChange("filing_foreign_taxes", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>
      )}
    </div>
  );
}
