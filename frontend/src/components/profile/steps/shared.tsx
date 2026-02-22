"use client";

import { cn } from "@/lib/utils";

// ─── Field wrapper ─────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-800">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

// ─── RadioCards ────────────────────────────────────────────────────────────────

interface RadioOption {
  value: string;
  label: string;
}

interface RadioCardsProps {
  value: string | null;
  onChange: (value: string) => void;
  options: RadioOption[];
  inline?: boolean;
}

export function RadioCards({ value, onChange, options, inline = false }: RadioCardsProps) {
  return (
    <div className={cn(inline ? "flex flex-wrap gap-2" : "space-y-2")}>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 border rounded-lg cursor-pointer text-sm transition-colors",
            value === opt.value
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:bg-gray-50"
          )}
        >
          <input
            type="radio"
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          <span className="w-3.5 h-3.5 rounded-full border-2 border-current flex items-center justify-center shrink-0">
            {value === opt.value && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </span>
          {opt.label}
        </label>
      ))}
    </div>
  );
}

// ─── YNS (Yes / No / optional extra) ──────────────────────────────────────────

interface YNSProps {
  value: string | null;
  onChange: (value: string) => void;
  extraOption?: RadioOption;
}

export function YNS({ value, onChange, extraOption }: YNSProps) {
  const options: RadioOption[] = [
    { value: "yes", label: "Yes" },
    { value: "no",  label: "No" },
  ];
  if (extraOption) options.push(extraOption);
  return <RadioCards value={value} onChange={onChange} options={options} inline />;
}

// ─── CheckboxGroup ─────────────────────────────────────────────────────────────

interface CheckboxGroupProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: { value: string; label: string }[];
}

export function CheckboxGroup({ values, onChange, options }: CheckboxGroupProps) {
  function toggle(v: string) {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      onChange([...values, v]);
    }
  }
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const checked = values.includes(opt.value);
        return (
          <label
            key={opt.value}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 border rounded-lg cursor-pointer text-sm transition-colors",
              checked ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(opt.value)}
              className="sr-only"
            />
            <span
              className={cn(
                "w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0",
                checked ? "border-blue-600 bg-blue-600" : "border-gray-300"
              )}
            >
              {checked && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}
