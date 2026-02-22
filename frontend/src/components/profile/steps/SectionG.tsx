"use client";

import type { QuestionnaireMainData } from "../QuestionnaireForm";
import { Field, YNS } from "./shared";

interface Props {
  data: QuestionnaireMainData;
  onChange: (field: string, value: unknown) => void;
}

export function SectionG({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-900">
        Section G — Potential Deductions &amp; Credits
      </h3>
      <p className="text-sm text-muted-foreground">
        Answer &quot;Yes&quot; if this applies to you — we&apos;ll flag the relevant deductions and forms.
        Answer &quot;Not sure&quot; if you&apos;re unsure; we&apos;ll explain what each means.
      </p>

      {/* Education */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Education</h4>

        <Field label="Did you pay tuition or fees for higher education that you haven't already reported?">
          <YNS
            value={data.deduct_tuition_fees}
            onChange={(v) => onChange("deduct_tuition_fees", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        <Field label="Did you pay interest on student loans?">
          <YNS
            value={data.deduct_student_loan_int}
            onChange={(v) => onChange("deduct_student_loan_int", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        <Field label="Can someone else claim you as a dependent on their tax return? (e.g. parent)">
          <YNS
            value={data.claimed_as_dependent}
            onChange={(v) => onChange("claimed_as_dependent", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>
      </div>

      {/* Work & family */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Work &amp; Family</h4>

        <Field label="Did you pay for childcare so you could work or look for work?">
          <YNS
            value={data.paid_childcare}
            onChange={(v) => onChange("paid_childcare", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        <Field label="Did you buy supplies or equipment used exclusively for work that were not reimbursed?">
          <YNS
            value={data.bought_work_supplies}
            onChange={(v) => onChange("bought_work_supplies", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        <Field label="Did you pay for professional memberships, certifications, or work-related communications out of pocket?">
          <YNS
            value={data.paid_biz_comms}
            onChange={(v) => onChange("paid_biz_comms", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        <Field label="Do you have a dedicated home office space used exclusively for work?">
          <YNS
            value={data.has_home_office}
            onChange={(v) => onChange("has_home_office", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>
      </div>

      {/* Housing */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Housing</h4>

        <Field label="Did you pay rent for your primary residence during the year?">
          <YNS
            value={data.paid_rent}
            onChange={(v) => onChange("paid_rent", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        <Field label="Did you pay mortgage interest on a home you own?">
          <YNS
            value={data.paid_mortgage}
            onChange={(v) => onChange("paid_mortgage", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>
      </div>

      {/* Charitable & taxes */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Charitable &amp; Taxes</h4>

        <Field label="Did you make any charitable donations (cash or non-cash)?">
          <YNS
            value={data.made_donations}
            onChange={(v) => onChange("made_donations", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        <Field label="Did you pay significant state, local, or property taxes?">
          <YNS
            value={data.paid_state_local_taxes}
            onChange={(v) => onChange("paid_state_local_taxes", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>
      </div>

      {/* Health & retirement */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Health &amp; Retirement</h4>

        <Field label="Did you contribute to an HSA (Health Savings Account)?">
          <YNS
            value={data.contributed_hsa}
            onChange={(v) => onChange("contributed_hsa", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        {data.contributed_hsa === "yes" && (
          <Field label="Did you withdraw money from your HSA for non-medical expenses?">
            <YNS
              value={data.withdrew_hsa}
              onChange={(v) => onChange("withdrew_hsa", v)}
              extraOption={{ value: "not_sure", label: "Not sure" }}
            />
          </Field>
        )}

        <Field label="Did you have large out-of-pocket medical or dental expenses not covered by insurance?">
          <YNS
            value={data.large_medical_expenses}
            onChange={(v) => onChange("large_medical_expenses", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>

        <Field label="Did you contribute to a traditional IRA, SEP-IRA, or other retirement account?">
          <YNS
            value={data.contributed_ira}
            onChange={(v) => onChange("contributed_ira", v)}
            extraOption={{ value: "not_sure", label: "Not sure" }}
          />
        </Field>
      </div>
    </div>
  );
}
