import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TaskWorkspace } from "@/components/tasks/TaskWorkspace";
import type { Document, Profile, Task, TaskDocument } from "@/types";

interface TaskPageProps {
  params: { taskId: string };
}

export default async function TaskPage({ params }: TaskPageProps) {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Load task (ensure it belongs to this user)
  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", params.taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!task) notFound();

  // Load any linked task_document + document (latest by created_at)
  const { data: taskDocs } = await supabase
    .from("task_documents")
    .select("*, documents(*)")
    .eq("task_id", params.taskId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const taskDoc = (taskDocs?.[0] as (TaskDocument & { documents: Document }) | undefined) ?? null;
  const document = taskDoc ? (taskDoc.documents as Document) : null;

  // Signed URL for PDF viewing, if a document exists
  let signedUrl: string | null = null;
  if (document) {
    const { data: signed } = await supabase.storage
      .from("tax-docs")
      .createSignedUrl(document.storage_path, 60 * 60);
    signedUrl = signed?.signedUrl ?? null;
  }

  // Preferred language from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("user_id", user.id)
    .single();

  const preferredLanguage = (profile as Profile | null)?.preferred_language ?? "en";

  return (
    <div className="h-[calc(100vh-4rem)]">
      <TaskWorkspace
        task={task as Task}
        initialTaskDocument={taskDoc as TaskDocument | null}
        initialDocument={document}
        documentUrl={signedUrl}
        preferredLanguage={preferredLanguage}
      />
    </div>
  );
}

