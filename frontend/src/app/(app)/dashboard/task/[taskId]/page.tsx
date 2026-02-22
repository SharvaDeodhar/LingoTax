import { redirect, notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TaskDetailView } from "@/components/task/TaskDetailView";
import type { Task, Document, Profile } from "@/types";

interface TaskDetailPageProps {
    params: Promise<{ taskId: string }>;
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
    const { taskId } = await params;
    const supabase = getSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Fetch the task (RLS enforces ownership)
    const { data: task } = await supabase
        .from("tasks")
        .select("*, task_groups(*)")
        .eq("id", taskId)
        .eq("user_id", user.id)
        .single();

    if (!task) notFound();

    // Fetch the most recent document linked to this task via documents.task_id
    const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(1);

    const document: Document | null =
        docs && docs.length > 0 ? (docs[0] as Document) : null;

    // Get user's preferred language
    const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("user_id", user.id)
        .single();

    const preferredLanguage =
        (profile as Profile | null)?.preferred_language ?? "en";

    return (
        <div className="h-[calc(100vh-4rem)]">
            <TaskDetailView
                task={task as Task}
                initialDocument={document}
                preferredLanguage={preferredLanguage}
            />
        </div>
    );
}
