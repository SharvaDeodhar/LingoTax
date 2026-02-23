"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createDocument, ingestDocument } from "@/lib/api/fastapi";
import { CURRENT_FILING_YEAR } from "@/lib/constants";
import type { Document } from "@/types";

interface FileUploadZoneProps {
  onUploadComplete: () => void;
  onDocumentRegistered?: (doc: Document) => void;
  filingYear?: number;
}

export function FileUploadZone({
  onUploadComplete,
  onDocumentRegistered,
  filingYear = CURRENT_FILING_YEAR,
}: FileUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      setError(null);
      setProgress("Uploading to storage…");

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Storage path: {user_id}/{timestamp}_{filename}
        const storagePath = `${user.id}/${Date.now()}_${file.name}`;

        // Step 1: Upload to Supabase Storage from browser
        const { error: storageError } = await supabase.storage
          .from("tax-docs")
          .upload(storagePath, file, { contentType: file.type });

        if (storageError) throw new Error(storageError.message);

        setProgress("Registering document…");

        // Step 2: Register document in DB via FastAPI
        const doc = await createDocument({
          filename: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          file_size_bytes: file.size,
          filing_year: filingYear,
        });

        setProgress("Starting AI processing…");

        // Step 3: Trigger ingestion pipeline
        await ingestDocument(doc.id);

        setProgress(null);
        onDocumentRegistered?.(doc);
        onUploadComplete();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        setProgress(null);
      }
    },
    [filingYear, onDocumentRegistered, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-[#2F8AE5] bg-gradient-to-br from-[#2F8AE5]/8 to-[#7DB3E8]/8 shadow-ct-card scale-[1.01]"
            : uploading
              ? "border-[#E2E8F0] bg-[#F8FAFC] cursor-not-allowed opacity-70"
              : "border-[#E2E8F0] bg-white hover:border-[#2F8AE5]/50 hover:shadow-ct-sm"
        }`}
      >
        <input {...getInputProps()} />
        <Upload
          className={`w-8 h-8 mx-auto mb-3 transition-colors ${
            isDragActive ? "text-[#2F8AE5]" : "text-[#64748B]"
          }`}
        />
        {uploading ? (
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">{progress}</p>
            <p className="text-xs text-[#64748B] mt-1">Please wait…</p>
          </div>
        ) : isDragActive ? (
          <p className="text-sm font-semibold text-[#2F8AE5]">Drop the PDF here</p>
        ) : (
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">
              Drag & drop a PDF, or{" "}
              <span className="text-[#2F8AE5] font-bold">click to select</span>
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Supports W-2, 1099, 1098-T, tax transcripts — PDF only
            </p>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}
