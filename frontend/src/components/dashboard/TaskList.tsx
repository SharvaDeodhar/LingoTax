"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { TaskCard } from "./TaskCard";
import { CURRENT_FILING_YEAR, TASK_GROUP_NAMES } from "@/lib/constants";
import type { Task, TaskGroup } from "@/types";

interface TasksByGroup {
  group: TaskGroup;
  tasks: Task[];
}

export function TaskList() {
  const [groups, setGroups] = useState<TasksByGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  const loadTasks = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: taskGroupsData }, { data: tasksData }] = await Promise.all([
      supabase.from("task_groups").select("*").order("sort_order"),
      supabase
        .from("tasks")
        .select("*, task_groups(id, name, sort_order)")
        .eq("user_id", user.id)
        .eq("filing_year", CURRENT_FILING_YEAR)
        .order("sort_order"),
    ]);

    const groupMap = new Map<string, TasksByGroup>();
    for (const g of taskGroupsData ?? []) {
      groupMap.set(g.id, { group: g as TaskGroup, tasks: [] });
    }

    for (const task of (tasksData as Task[]) ?? []) {
      if (task.task_group_id && groupMap.has(task.task_group_id)) {
        groupMap.get(task.task_group_id)!.tasks.push(task);
      }
    }

    setGroups(Array.from(groupMap.values()));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function handleAddTask(groupId: string) {
    if (!newTaskTitle.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("tasks").insert({
      user_id: user.id,
      task_group_id: groupId,
      title: newTaskTitle.trim(),
      filing_year: CURRENT_FILING_YEAR,
      status: "not_started",
    });

    setNewTaskTitle("");
    setAddingToGroup(null);
    loadTasks();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(({ group, tasks }) => (
        <div key={group.id}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {group.name}
            </h3>
            <button
              onClick={() => setAddingToGroup(group.id)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>

          {addingToGroup === group.id && (
            <div className="flex gap-2 mb-2">
              <input
                autoFocus
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTask(group.id);
                  if (e.key === "Escape") setAddingToGroup(null);
                }}
                placeholder="Task title…"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleAddTask(group.id)}
                className="px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs"
              >
                Add
              </button>
              <button
                onClick={() => setAddingToGroup(null)}
                className="px-2 py-1.5 border rounded-lg text-xs text-gray-600"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="space-y-2">
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No tasks yet — click Add to create one
              </p>
            ) : (
              tasks.map((task) => (
                <TaskCard key={task.id} task={task} onUpdated={loadTasks} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
