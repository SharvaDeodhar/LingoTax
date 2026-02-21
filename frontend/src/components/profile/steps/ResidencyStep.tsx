"use client";

import { VISA_TYPES } from "@/lib/constants";
import type { ResidencyStatus } from "@/types";

interface ResidencyStepProps {
  data: {
    residency_status: string | null;
    visa_type: string | null;
    has_ssn: boolean | null;
    has_itin: boolean | null;
  };
  onChange: (field: string, value: unknown) => void;
}

const RESIDENCY_OPTIONS: { value: ResidencyStatus; label: string; description: string }[] = [
  { value: "citizen",            label: "US Citizen",             description: "Born in the US or naturalized" },
  { value: "permanent_resident", label: "Permanent Resident",     description: "Green card holder" },
  { value: "resident_alien",     label: "Resident Alien",         description: "Pass the Substantial Presence Test" },
  { value: "nonresident_alien",  label: "Nonresident Alien",      description: "Do NOT pass the Substantial Presence Test" },
  { value: "dual_status",        label: "Dual Status",            description: "Part of the year resident, part nonresident" },
  { value: "unsure",             label: "Not sure",               description: "I need help figuring this out" },
];

export function ResidencyStep({ data, onChange }: ResidencyStepProps) {
  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold">Residency & immigration status</h3>

      {/* Residency status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tax residency status
        </label>
        <div className="space-y-2">
          {RESIDENCY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                data.residency_status === opt.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="residency_status"
                value={opt.value}
                checked={data.residency_status === opt.value}
                onChange={() => onChange("residency_status", opt.value)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Visa type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Visa type (if applicable)
        </label>
        <select
          value={data.visa_type ?? ""}
          onChange={(e) => onChange("visa_type", e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Not applicable / US citizen / Green card —</option>
          {VISA_TYPES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {/* SSN / ITIN */}
      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.has_ssn === true}
            onChange={(e) => onChange("has_ssn", e.target.checked || null)}
          />
          <span className="text-sm">I have an SSN</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.has_itin === true}
            onChange={(e) => onChange("has_itin", e.target.checked || null)}
          />
          <span className="text-sm">I have an ITIN</span>
        </label>
      </div>
    </div>
  );
}
