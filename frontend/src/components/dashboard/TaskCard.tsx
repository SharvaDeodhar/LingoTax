"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Clock, ChevronRight, Trash2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

interface TaskCardProps {
  task: Task;
  onUpdated: () => void;
}

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  not_started: <Circle className="w-4 h-4 text-[#E2E8F0]" />,
  in_progress: <Clock className="w-4 h-4 text-amber-400" />,
  done: <CheckCircle2 className="w-4 h-4 text-[#10B981]" />,
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  not_started: "in_progress",
  in_progress: "done",
  done: "not_started",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
};

export function TaskCard({ task, onUpdated }: TaskCardProps) {
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  async function cycleStatus(e: React.MouseEvent) {
    e.stopPropagation();
    setUpdating(true);

    const next = NEXT_STATUS[task.status];
    await supabase.from("tasks").update({ status: next }).eq("id", task.id);

    onUpdated();
    setUpdating(false);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(true);

    await supabase.from("tasks").delete().eq("id", task.id);

    onUpdated();
    setDeleting(false);
  }

  function handleCardClick() {
    router.push(`/dashboard/task/${task.id}`);
  }

  const isClickable = true;

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200",
        task.status === "done"
          ? "bg-[#10B981]/5 border-[#10B981]/20"
          : "bg-white border-[#E2E8F0] hover:border-[#2F8AE5]/30",
        isClickable && "cursor-pointer hover:-translate-y-0.5 hover:shadow-ct-card"
      )}
    >
      <button
        onClick={cycleStatus}
        disabled={updating}
        className="mt-0.5 shrink-0 disabled:opacity-50"
        title={`Mark as ${STATUS_LABELS[NEXT_STATUS[task.status]]}`}
      >
        {STATUS_ICONS[task.status]}
      </button>

      <div className="min-w-0 flex-1 text-left">
        <p
          className={cn(
            "text-sm font-semibold text-[#0F172A]",
            task.status === "done" && "line-through text-[#64748B]"
          )}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-[#64748B] mt-0.5">
            {task.description}
          </p>
        )}
      </div>

      {isClickable && (
        <ChevronRight className="w-4 h-4 text-[#64748B] mt-0.5 shrink-0" />
      )}

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="ml-1 p-1 rounded-lg hover:bg-red-50 text-[#E2E8F0] hover:text-red-400 transition-all duration-200 disabled:opacity-50 shrink-0"
        title="Remove task"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
