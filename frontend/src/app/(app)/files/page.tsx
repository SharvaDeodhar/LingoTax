"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { FileUploadZone } from "@/components/files/FileUploadZone";
import { DocumentCard } from "@/components/files/DocumentCard";
import { CURRENT_FILING_YEAR } from "@/lib/constants";
import type { Document } from "@/types";

export default function FilesPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseBrowserClient();

  const loadDocuments = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .eq("filing_year", CURRENT_FILING_YEAR)
      .order("created_at", { ascending: false });

    setDocuments((data as Document[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0F172A]">Tax Documents</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Upload your tax forms. Once processed, you can chat with the AI about
          each document in your language.
        </p>
      </div>

      <FileUploadZone onUploadComplete={loadDocuments} />

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[#0F172A] mb-3 tracking-tight">
          Your documents — {CURRENT_FILING_YEAR}
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-[#64748B] py-8 text-center">
            No documents uploaded yet. Upload your first tax form above.
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
