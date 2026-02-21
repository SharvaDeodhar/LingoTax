"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import type { ChunkSource } from "@/types";

interface SourceCitationsProps {
  sources: ChunkSource[];
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gray-700 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        {sources.length} source{sources.length > 1 ? "s" : ""} from document
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((src, i) => (
            <div
              key={src.chunk_id ?? i}
              className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs"
            >
              <div className="flex items-center gap-1.5 text-blue-700 font-medium mb-1">
                <FileText className="w-3 h-3" />
                {src.page ? `Page ${src.page}` : "Document excerpt"}
                {src.similarity > 0 && (
                  <span className="ml-auto text-blue-400">
                    {Math.round(src.similarity * 100)}% match
                  </span>
                )}
              </div>
              <p className="text-gray-600 leading-relaxed">{src.chunk_text}</p>
              {src.form_fields && Object.keys(src.form_fields).length > 0 && (
                <div className="mt-2 pt-2 border-t border-blue-100">
                  <p className="text-blue-700 font-medium mb-1">Form fields:</p>
                  {Object.entries(src.form_fields).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-gray-500">{k}:</span>
                      <span className="text-gray-700 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
