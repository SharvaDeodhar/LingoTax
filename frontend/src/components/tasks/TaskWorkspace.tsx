"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Save, CheckCircle2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { FileUploadZone } from "@/components/files/FileUploadZone";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { IngestStatusBadge } from "@/components/files/IngestStatusBadge";
import { PdfViewer } from "@/components/task/PdfViewer";
import { CURRENT_FILING_YEAR } from "@/lib/constants";
import type { Document, Task, TaskDocument } from "@/types";

interface TaskWorkspaceProps {
  task: Task;
  initialTaskDocument: TaskDocument | null;
  initialDocument: Document | null;
  documentUrl: string | null;
  preferredLanguage: string;
}

export function TaskWorkspace({
  task,
  initialTaskDocument,
  initialDocument,
  documentUrl,
  preferredLanguage,
}: TaskWorkspaceProps) {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  const [doc, setDoc] = useState<Document | null>(initialDocument);
  const [taskDoc, setTaskDoc] = useState<TaskDocument | null>(initialTaskDocument);
  const [pdfUrl, setPdfUrl] = useState<string | null>(documentUrl);
  const [notes, setNotes] = useState(
    (initialTaskDocument?.progress_data as { notes?: string } | undefined)?.notes ?? ""
  );
  const [savingNotes, setSavingNotes] = useState(false);

  // When a new document is registered via upload, link it to this task
  async function handleDocumentRegistered(newDoc: Document) {
    setDoc(newDoc);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Create task_documents row
    const { data: inserted, error } = await supabase
      .from("task_documents")
      .insert({
        user_id: user.id,
        task_id: task.id,
        document_id: newDoc.id,
        status: "uploaded",
        progress_data: { notes: "" },
      })
      .select("*")
      .single();

    if (!error && inserted) {
      setTaskDoc(inserted as TaskDocument);
    }

    // Bump task status to in_progress so dashboard reflects progress
    await supabase.from("tasks").update({ status: "in_progress" }).eq("id", task.id);

    // Refresh the page to get a signed URL for the new document
    router.replace(`/tasks/${task.id}`);
  }

  async function handleSaveNotes() {
    if (!taskDoc) return;
    setSavingNotes(true);
    await supabase
      .from("task_documents")
      .update({
        progress_data: { ...(taskDoc.progress_data ?? {}), notes },
      })
      .eq("id", taskDoc.id);
    setSavingNotes(false);
  }

  async function handleMarkComplete() {
    // Mark task-document as completed and task as done
    if (taskDoc) {
      await supabase
        .from("task_documents")
        .update({ status: "completed" })
        .eq("id", taskDoc.id);
    }
    await supabase.from("tasks").update({ status: "done" }).eq("id", task.id);
    router.push("/dashboard");
  }

  // Refresh signed URL when coming back without a full reload
  useEffect(() => {
    async function refreshSignedUrl() {
      if (!doc) return;
      const { data } = await supabase.storage
        .from("tax-docs")
        .createSignedUrl(doc.storage_path, 60 * 60);
      setPdfUrl(data?.signedUrl ?? null);
    }

    if (doc && !pdfUrl) {
      void refreshSignedUrl();
    }
  }, [doc, pdfUrl, supabase]);

  const showUploadState = !doc;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
              {task.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleMarkComplete}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mark complete
        </button>
      </div>

      {/* Body */}
      {showUploadState ? (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Upload a document for this task
            </h2>
            <p className="text-xs text-muted-foreground">
              Attach the relevant tax form or document so the assistant can guide you
              step-by-step. You&apos;ll be able to chat with the AI and save progress.
            </p>
            <FileUploadZone
              onUploadComplete={() => {
                // no-op; we react via onDocumentRegistered
              }}
              onDocumentRegistered={handleDocumentRegistered}
              filingYear={task.filing_year ?? CURRENT_FILING_YEAR}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: chatbot (40%) */}
          <div className="md:w-[40%] border-r flex flex-col">
            {doc && doc.ingest_status === "ready" ? (
              <ChatInterface
                document={doc}
                preferredLanguage={preferredLanguage}
                autoSummarize={true}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <IngestStatusBadge status={doc?.ingest_status ?? "pending"} />
                <p className="mt-3 text-sm font-medium text-gray-700">
                  Preparing your document for chat
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  Once processing is complete, you&apos;ll be able to ask questions about
                  this document in your preferred language.
                </p>
              </div>
            )}
          </div>

          {/* Right: document viewer + notes (60%) */}
          <div className="md:w-[60%] flex flex-col overflow-hidden bg-gray-50">
            <div className="px-4 py-3 border-b flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs font-medium truncate max-w-[220px]">
                    {doc?.filename}
                  </p>
                </div>
              </div>
              {doc && (
                <IngestStatusBadge status={doc.ingest_status} />
              )}
            </div>
            <div className="flex-1 overflow-hidden relative">
              {pdfUrl ? (
                <PdfViewer
                  url={pdfUrl}
                  documentId={doc?.id ?? ""}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading document preview…
                </div>
              )}
            </div>

            {/* Notes / progress */}
            <div className="border-t bg-white p-4 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700">
                  Notes &amp; progress
                </p>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {savingNotes ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3" />
                      Save
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Keep track of which boxes you’ve filled, questions to ask, or anything else you want to remember..."
                className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

