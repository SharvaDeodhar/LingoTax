"use client";

import Link from "next/link";
import { FileText, MessageSquare } from "lucide-react";
import { IngestStatusBadge } from "./IngestStatusBadge";
import { useIngestStatus } from "@/lib/hooks/useIngestStatus";
import { formatFileSize, formatDate } from "@/lib/utils";
import type { Document } from "@/types";

interface DocumentCardProps {
  document: Document;
}

export function DocumentCard({ document: doc }: DocumentCardProps) {
  // Poll for status updates if not in a terminal state
  const status = useIngestStatus(doc.id, doc.ingest_status);

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <FileText className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{doc.filename}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <IngestStatusBadge status={status} />
            <span className="text-xs text-muted-foreground">
              {formatFileSize(doc.file_size_bytes)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(doc.created_at)}
            </span>
          </div>
          {status === "error" && doc.error_message && (
            <p className="text-xs text-red-600 mt-1">{doc.error_message}</p>
          )}
        </div>
      </div>

      {status === "ready" && (
        <Link
          href={`/files/${doc.id}/chat`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shrink-0 ml-3"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
        </Link>
      )}
    </div>
  );
}
