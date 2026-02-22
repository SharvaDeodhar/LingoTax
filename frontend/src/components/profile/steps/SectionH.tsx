"use client";

import { DOCUMENT_TYPES } from "@/lib/constants";
import type { QuestionnaireMainData } from "../QuestionnaireForm";
import { Field, RadioCards, YNS, CheckboxGroup } from "./shared";

interface Props {
  data: QuestionnaireMainData;
  onChange: (field: string, value: unknown) => void;
}

export function SectionH({ data, onChange }: Props) {
  const showLostFollow =
    data.lost_forms === "yes" || data.waiting_for_forms === "yes";

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-900">
        Section H — Document Inventory
      </h3>
      <p className="text-sm text-muted-foreground">
        Help us understand what tax documents you already have. This helps us create a
        checklist of what&apos;s still missing.
      </p>

      {/* Documents already in hand */}
      <Field
        label="Which of the following tax documents do you already have?"
        hint="Select all that apply."
      >
        <CheckboxGroup
          values={data.owned_documents}
          onChange={(v) => onChange("owned_documents", v)}
          options={DOCUMENT_TYPES as unknown as { value: string; label: string }[]}
        />
      </Field>

      {/* Waiting for forms */}
      <Field label="Are you still waiting to receive any tax forms in the mail or electronically?">
        <YNS
          value={data.waiting_for_forms}
          onChange={(v) => onChange("waiting_for_forms", v)}
          extraOption={{ value: "not_sure", label: "Not sure" }}
        />
      </Field>

      {/* Lost forms */}
      <Field label="Have you lost or misplaced any tax documents?">
        <RadioCards
          value={data.lost_forms}
          onChange={(v) => onChange("lost_forms", v)}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no",  label: "No" },
          ]}
          inline
        />
      </Field>

      {/* Can contact issuer */}
      {showLostFollow && (
        <Field
          label="Can you contact the issuer (employer, bank, school, etc.) to get a replacement?"
          hint="Most issuers can reissue documents through their online portals or by request."
        >
          <YNS
            value={data.can_contact_issuer}
            onChange={(v) => onChange("can_contact_issuer", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>
      )}
    </div>
  );
}
