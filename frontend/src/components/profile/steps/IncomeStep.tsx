"use client";

import { INCOME_SOURCES } from "@/lib/constants";

interface IncomeStepProps {
  data: {
    income_sources: string[];
  };
  onChange: (field: string, value: unknown) => void;
}

export function IncomeStep({ data, onChange }: IncomeStepProps) {
  function toggle(value: string) {
    const current = data.income_sources;
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange("income_sources", updated);
  }

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold">Income sources</h3>
      <p className="text-sm text-muted-foreground">
        Select all that apply for the filing year. This determines which forms
        you need and what tasks to prepare.
      </p>

      <div className="space-y-2">
        {INCOME_SOURCES.map((source) => (
          <label
            key={source.value}
            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
              data.income_sources.includes(source.value)
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={data.income_sources.includes(source.value)}
              onChange={() => toggle(source.value)}
              className="rounded"
            />
            <span className="text-sm">{source.label}</span>
          </label>
        ))}
      </div>

      {data.income_sources.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
          If you had zero income, you may still need to file Form 8843 (if on
          F-1/J-1 visa) or Form 1040 for other reasons. Continue to the next
          step.
        </p>
      )}
    </div>
  );
}
