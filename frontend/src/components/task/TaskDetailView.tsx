"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
    createDocument,
    ingestDocument,
    getDocumentSignedUrl,
} from "@/lib/api/fastapi";
import dynamic from "next/dynamic";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { CURRENT_FILING_YEAR } from "@/lib/constants";

const PdfViewer = dynamic(
    () => import("@/components/task/PdfViewer").then((m) => m.PdfViewer),
    {
        ssr: false,
        loading: () => (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
        ),
    }
);
import type { Task, Document as DocType, IngestStatus } from "@/types";

type Phase = "upload" | "processing" | "ready";

interface TaskDetailViewProps {
    task: Task;
    initialDocument: DocType | null;
    preferredLanguage: string;
}

export function TaskDetailView({
    task,
    initialDocument,
    preferredLanguage,
}: TaskDetailViewProps) {
    const [document, setDocument] = useState<DocType | null>(initialDocument);
    const [ingestStatus, setIngestStatus] = useState<IngestStatus | null>(
        initialDocument?.ingest_status ?? null
    );
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const supabase = getSupabaseBrowserClient();

    // Which phase to show
    const phase: Phase = !document
        ? "upload"
        : ingestStatus === "ready"
            ? "ready"
            : "processing";

    // Poll for ingestion status until it reaches a terminal state
    useEffect(() => {
        if (!document || ingestStatus === "ready" || ingestStatus === "error") return;

        const interval = setInterval(async () => {
            try {
                const { data } = await supabase
                    .from("documents")
                    .select("ingest_status")
                    .eq("id", document.id)
                    .single();

                if (data?.ingest_status) {
                    setIngestStatus(data.ingest_status as IngestStatus);
                }
            } catch {
                // Silently ignore transient errors
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [document, ingestStatus, supabase]);

    // Fetch a signed URL once the document is ready
    useEffect(() => {
        if (ingestStatus !== "ready" || !document || signedUrl) return;

        getDocumentSignedUrl(document.id)
            .then((r) => setSignedUrl(r.signed_url))
            .catch((err) => console.error("Failed to get signed URL:", err));
    }, [ingestStatus, document, signedUrl]);

    // Re-fetch the document linked to this task by task_id
    const refreshDocument = useCallback(async () => {
        const { data: docs } = await supabase
            .from("documents")
            .select("*")
            .eq("task_id", task.id)
            .order("created_at", { ascending: false })
            .limit(1);

        if (docs && docs.length > 0) {
            const doc = docs[0] as DocType;
            setDocument(doc);
            setIngestStatus(doc.ingest_status);
        }
    }, [supabase, task.id]);

    async function handleFileUpload(files: FileList | File[]) {
        const file = files instanceof FileList ? files[0] : files[0];
        if (!file) return;

        setUploading(true);
        setUploadError(null);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Upload to Supabase Storage
            const storagePath = `${user.id}/${Date.now()}_${file.name}`;
            const { error: storageError } = await supabase.storage
                .from("tax-docs")
                .upload(storagePath, file, { contentType: file.type });

            if (storageError) throw new Error(storageError.message);

            // 2. Register document in DB, linking it to this task via task_id
            const doc = await createDocument({
                filename: file.name,
                storage_path: storagePath,
                mime_type: file.type,
                file_size_bytes: file.size,
                filing_year: CURRENT_FILING_YEAR,
                task_id: task.id,
            });

            // 3. Move task to in_progress (only if still not started)
            await supabase
                .from("tasks")
                .update({ status: "in_progress" })
                .eq("id", task.id)
                .eq("status", "not_started");

            // 4. Start ingestion pipeline
            await ingestDocument(doc.id);

            setDocument(doc);
            setIngestStatus("processing");
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-white flex items-center gap-4">
                <Link
                    href="/dashboard"
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Back to dashboard"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div className="min-w-0">
                    <h1 className="text-lg font-bold truncate">{task.title}</h1>
                    {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {task.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Phase: Upload */}
            {phase === "upload" && (
                <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
                    <div className="max-w-lg w-full">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
                                <FileText className="w-8 h-8 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Upload your document
                            </h2>
                            <p className="text-sm text-muted-foreground mt-2">
                                Upload the PDF for this task. Once processed, the AI will
                                translate and explain it in your preferred language.
                            </p>
                        </div>

                        {/* Drop zone */}
                        <div
                            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${uploading
                                    ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                                    : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                                }`}
                            onClick={() => {
                                if (uploading) return;
                                const input = window.document.createElement("input");
                                input.type = "file";
                                input.accept = ".pdf";
                                input.onchange = (e) => {
                                    const f = (e.target as HTMLInputElement).files;
                                    if (f) handleFileUpload(f);
                                };
                                input.click();
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (!uploading) handleFileUpload(e.dataTransfer.files);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <FileText className="w-8 h-8 mx-auto text-gray-400 mb-3" />
                            {uploading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    <p className="text-sm font-medium text-gray-700">
                                        Uploading &amp; processing…
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium text-gray-700">
                                        Click to select or drag a PDF here
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        PDF only — your progress is saved automatically
                                    </p>
                                </div>
                            )}
                        </div>

                        {uploadError && (
                            <p className="mt-3 text-sm text-red-600 text-center">
                                {uploadError}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Phase: Processing */}
            {phase === "processing" && (
                <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-50 mb-4">
                            <Loader2 className="w-8 h-8 text-yellow-600 animate-spin" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Processing your document…
                        </h2>
                        <p className="text-sm text-muted-foreground mt-2 max-w-md">
                            The AI is reading and vectorizing your document so it can answer
                            questions about it. This usually takes 15–30 seconds.
                        </p>
                        {ingestStatus === "error" && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                Processing failed. Please try uploading again.
                                <button
                                    onClick={() => {
                                        setDocument(null);
                                        setIngestStatus(null);
                                    }}
                                    className="ml-2 underline"
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Phase: Ready — Chat left, PDF right */}
            {phase === "ready" && document && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Chat (45%) */}
                    <div className="w-[45%] border-r flex flex-col">
                        <ChatInterface
                            document={document}
                            preferredLanguage={preferredLanguage}
                            autoSummarize={true}
                        />
                    </div>

                    {/* Right: PDF Viewer (55%) */}
                    <div className="w-[55%] flex flex-col">
                        {signedUrl ? (
                            <PdfViewer url={signedUrl} />
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
