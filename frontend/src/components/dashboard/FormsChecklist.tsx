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
  pending:  { icon: <Circle className="w-4 h-4 text-gray-300" />,         label: "Pending",  color: "text-gray-500" },
  received: { icon: <FileCheck className="w-4 h-4 text-yellow-500" />,    label: "Received", color: "text-yellow-600" },
  filed:    { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,  label: "Filed",    color: "text-green-600" },
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
        <p className="text-sm text-muted-foreground">
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
              "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
              item.status === "filed"
                ? "bg-green-50 border-green-100"
                : "bg-white border-gray-100 hover:border-gray-200"
            )}
          >
            <span className="mt-0.5 shrink-0">{config.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{form?.form_code ?? "Form"}</p>
              <p className="text-xs text-muted-foreground truncate">
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
