"use client";

import { US_STATES } from "@/lib/constants";

interface StatesStepProps {
  data: {
    states_lived: string[];
    states_worked: string[];
  };
  onChange: (field: string, value: unknown) => void;
}

function MultiStateSelect({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(code: string) {
    const updated = value.includes(code)
      ? value.filter((s) => s !== code)
      : [...value, code];
    onChange(updated);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="h-40 overflow-y-auto p-2 space-y-1">
          {US_STATES.map((state) => (
            <label
              key={state.code}
              className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm transition-colors ${
                value.includes(state.code)
                  ? "bg-blue-50 text-blue-800"
                  : "hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={value.includes(state.code)}
                onChange={() => toggle(state.code)}
                className="rounded"
              />
              {state.code} — {state.name}
            </label>
          ))}
        </div>
      </div>
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          Selected: {value.join(", ")}
        </p>
      )}
    </div>
  );
}

export function StatesStep({ data, onChange }: StatesStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold">States</h3>

      <MultiStateSelect
        label="States you lived in"
        description="Select all states where you had a home address during the tax year"
        value={data.states_lived}
        onChange={(v) => onChange("states_lived", v)}
      />

      <MultiStateSelect
        label="States you worked in"
        description="Select all states where you earned income (can differ from where you lived)"
        value={data.states_worked}
        onChange={(v) => onChange("states_worked", v)}
      />

      {data.states_worked.length > 1 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          You worked in multiple states — you will likely need to file a state
          return for each state where you earned income.
        </div>
      )}
    </div>
  );
}
