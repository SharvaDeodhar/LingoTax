"use client";

import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import type { FilingStatus } from "@/types";

interface PersonalStepProps {
  data: {
    filing_year: number;
    filing_status: string | null;
    num_dependents: number;
  };
  onChange: (field: string, value: unknown) => void;
}

const FILING_STATUSES: { value: FilingStatus; label: string }[] = [
  { value: "single",                    label: "Single" },
  { value: "married_filing_jointly",    label: "Married filing jointly" },
  { value: "married_filing_separately", label: "Married filing separately" },
  { value: "head_of_household",         label: "Head of household" },
  { value: "qualifying_widow",          label: "Qualifying widow(er)" },
];

export function PersonalStep({ data, onChange }: PersonalStepProps) {
  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold">Personal information</h3>

      {/* Filing year */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tax filing year
        </label>
        <select
          value={data.filing_year}
          onChange={(e) => onChange("filing_year", Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[2024, 2023, 2022].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Filing status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Filing status
        </label>
        <select
          value={data.filing_status ?? ""}
          onChange={(e) => onChange("filing_status", e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Select —</option>
          {FILING_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Dependents */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Number of dependents
        </label>
        <input
          type="number"
          min={0}
          max={20}
          value={data.num_dependents}
          onChange={(e) => onChange("num_dependents", Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Children or other qualifying dependents you can claim
        </p>
      </div>
    </div>
  );
}
