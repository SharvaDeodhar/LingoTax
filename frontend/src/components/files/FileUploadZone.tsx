"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createDocument, ingestDocument } from "@/lib/api/fastapi";
import { CURRENT_FILING_YEAR } from "@/lib/constants";

interface FileUploadZoneProps {
  onUploadComplete: () => void;
  filingYear?: number;
}

export function FileUploadZone({
  onUploadComplete,
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
        onUploadComplete();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        setProgress(null);
      }
    },
    [filingYear, onUploadComplete]
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
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : uploading
            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-3" />
        {uploading ? (
          <div>
            <p className="text-sm font-medium text-gray-700">{progress}</p>
            <p className="text-xs text-muted-foreground mt-1">Please wait…</p>
          </div>
        ) : isDragActive ? (
          <p className="text-sm font-medium text-blue-600">Drop the PDF here</p>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-700">
              Drag & drop a PDF, or{" "}
              <span className="text-blue-600">click to select</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports W-2, 1099, 1098-T, tax transcripts — PDF only
            </p>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
