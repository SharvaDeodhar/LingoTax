"use client";

import { useEffect, useState } from "react";
import type { IngestStatus } from "@/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Polls the documents table every 3 seconds until ingest_status reaches
 * a terminal state ("ready" or "error").
 *
 * Uses Supabase JS client (browser) with RLS enforced — user can only
 * read their own documents.
 */
export function useIngestStatus(
  documentId: string,
  initialStatus: IngestStatus
): IngestStatus {
  const [status, setStatus] = useState<IngestStatus>(initialStatus);

  useEffect(() => {
    // Already in a terminal state — no need to poll
    if (status === "ready" || status === "error") return;

    const interval = setInterval(async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from("documents")
          .select("ingest_status")
          .eq("id", documentId)
          .single();

        if (data?.ingest_status) {
          setStatus(data.ingest_status as IngestStatus);
        }
      } catch {
        // Silently ignore transient network errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [documentId, status]);

  return status;
}
