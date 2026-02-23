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
    <div className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-xl bg-white shadow-ct-sm hover:-translate-y-0.5 hover:shadow-ct-card transition-all duration-200">
      <div className="flex items-start gap-3 min-w-0">
        <FileText className="w-5 h-5 text-[#2F8AE5] mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0F172A] truncate">{doc.filename}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <IngestStatusBadge status={status} />
            <span className="text-xs text-[#64748B]">
              {formatFileSize(doc.file_size_bytes)}
            </span>
            <span className="text-xs text-[#64748B]">
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#2F8AE5] to-[#7DB3E8] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-all duration-200 shrink-0 ml-3 shadow-ct-sm"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
        </Link>
      )}
    </div>
  );
}
