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
  not_started: <Circle className="w-4 h-4 text-gray-300" />,
  in_progress: <Clock className="w-4 h-4 text-yellow-500" />,
  done: <CheckCircle2 className="w-4 h-4 text-green-500" />,
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
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        task.status === "done"
          ? "bg-green-50 border-green-100"
          : "bg-white border-gray-100 hover:border-gray-200",
        isClickable && "cursor-pointer hover:shadow-sm"
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
            "text-sm font-medium",
            task.status === "done" && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {task.description}
          </p>
        )}
      </div>

      {isClickable && (
        <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      )}

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="ml-1 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
        title="Remove task"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}