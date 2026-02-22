"use client";

import { LIFE_EVENTS } from "@/lib/constants";
import type { QuestionnaireMainData } from "../QuestionnaireForm";
import { Field, RadioCards, YNS, CheckboxGroup } from "./shared";

interface Props {
  data: QuestionnaireMainData;
  onChange: (field: string, value: unknown) => void;
}

export function SectionF({ data, onChange }: Props) {
  const showMarketplaceFollow =
    data.health_coverage === "part_year" || data.health_coverage === "no";
  const showForm1095a = data.marketplace_insurance === "yes";

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-900">
        Section F — Health Coverage &amp; Life Events
      </h3>

      {/* Health coverage */}
      <Field label="Did you have health insurance coverage during the tax year?">
        <RadioCards
          value={data.health_coverage}
          onChange={(v) => onChange("health_coverage", v)}
          options={[
            { value: "all_year",  label: "Yes, all year" },
            { value: "part_year", label: "Part of the year" },
            { value: "no",        label: "No" },
            { value: "not_sure",  label: "Not sure" },
          ]}
        />
      </Field>

      {/* Marketplace insurance */}
      {showMarketplaceFollow && (
        <Field
          label="Was your coverage through the Health Insurance Marketplace (e.g. healthcare.gov)?"
          hint="This affects whether you need Form 8962 (Premium Tax Credit)."
        >
          <YNS
            value={data.marketplace_insurance}
            onChange={(v) => onChange("marketplace_insurance", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>
      )}

      {/* 1095-A */}
      {showForm1095a && (
        <Field label="Did you receive Form 1095-A (Health Insurance Marketplace Statement)?">
          <YNS
            value={data.received_1095a}
            onChange={(v) => onChange("received_1095a", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>
      )}

      {/* Life events */}
      <Field
        label="Did any of the following life events happen to you during the tax year?"
        hint="Select all that apply. These may affect your filing requirements or available credits."
      >
        <CheckboxGroup
          values={data.life_events}
          onChange={(v) => onChange("life_events", v)}
          options={LIFE_EVENTS as unknown as { value: string; label: string }[]}
        />
      </Field>
    </div>
  );
}
