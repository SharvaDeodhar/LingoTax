"use client";

import { useState } from "react";
import { CheckCircle2, Circle, FileCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UserFormChecklist, FormChecklistStatus } from "@/types";

interface FormsChecklistProps {
  initialChecklist: UserFormChecklist[];
}

const STATUS_CYCLE: Record<FormChecklistStatus, FormChecklistStatus> = {
  pending:  "received",
  received: "filed",
  filed:    "pending",
};

const STATUS_CONFIG: Record<FormChecklistStatus, { icon: React.ReactNode; label: string; color: string }> = {
  pending:  { icon: <Circle className="w-4 h-4 text-[#E2E8F0]" />,          label: "Pending",  color: "text-[#64748B]" },
  received: { icon: <FileCheck className="w-4 h-4 text-amber-400" />,        label: "Received", color: "text-amber-600" },
  filed:    { icon: <CheckCircle2 className="w-4 h-4 text-[#10B981]" />,     label: "Filed",    color: "text-[#10B981]" },
};

export function FormsChecklist({ initialChecklist }: FormsChecklistProps) {
  const [checklist, setChecklist] = useState<UserFormChecklist[]>(initialChecklist);
  const [updating, setUpdating] = useState<string | null>(null);
  const supabase = getSupabaseBrowserClient();

  async function cycleStatus(item: UserFormChecklist) {
    setUpdating(item.id);
    const next = STATUS_CYCLE[item.status];
    await supabase
      .from("user_form_checklist")
      .update({ status: next })
      .eq("id", item.id);
    setChecklist((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, status: next } : c))
    );
    setUpdating(null);
  }

  if (checklist.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#64748B]">
          Complete your profile to see recommended forms.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {checklist.map((item) => {
        const config = STATUS_CONFIG[item.status];
        const form = item.forms_catalog;
        return (
          <button
            key={item.id}
            onClick={() => cycleStatus(item)}
            disabled={updating === item.id}
            className={cn(
              "w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200",
              item.status === "filed"
                ? "bg-[#10B981]/5 border-[#10B981]/20"
                : "bg-white border-[#E2E8F0] hover:border-[#2F8AE5]/30 hover:shadow-ct-sm"
            )}
          >
            <span className="mt-0.5 shrink-0">{config.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0F172A]">{form?.form_code ?? "Form"}</p>
              <p className="text-xs text-[#64748B] truncate">
                {form?.display_name}
              </p>
              <p className={cn("text-xs font-medium mt-0.5", config.color)}>
                {config.label}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
