"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import type { Source } from "@/types";

interface SourceCitationsProps {
  sources: Source[];
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
              key={i}
              className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm text-xs relative group"
            >
              <div className="flex items-center gap-1.5 text-gray-700 font-medium mb-1">
                <FileText className="w-3 h-3 text-blue-500" />
                {src.page ? `Page ${src.page}` : "Document excerpt"}
                {src.label && (
                  <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] uppercase tracking-wide">
                    {src.label}
                  </span>
                )}

                {/* Jump to Page button - assumes parent or PDF viewer can handle this via event/storage */}
                <button
                  onClick={() => {
                    if (src.page) {
                      // Custom event for PdfViewer to catch
                      window.dispatchEvent(new CustomEvent('jump-to-page', { detail: { page: src.page } }));
                    }
                  }}
                  className="ml-auto text-blue-600 hover:text-blue-800 font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Jump to page
                </button>
              </div>
              <p className="text-gray-600 leading-relaxed italic line-clamp-2 hover:line-clamp-none transition-all">
                &ldquo;{src.snippet}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
