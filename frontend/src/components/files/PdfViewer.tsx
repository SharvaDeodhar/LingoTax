"use client";

import { useState } from "react";
import { Edit3, Eye } from "lucide-react";
import { PdfFormEditor } from "./PdfFormEditor";

interface PdfViewerProps {
    url: string;
    documentId: string;
    onSaveComplete?: () => void;
}

export function PdfViewer({ url, documentId, onSaveComplete }: PdfViewerProps) {
    const [editMode, setEditMode] = useState(false);
    const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
    const [loading, setLoading] = useState(true);

    // Load PDF bytes for editing
    useState(() => {
        async function loadPdf() {
            try {
                const response = await fetch(url);
                const buffer = await response.arrayBuffer();
                setPdfBytes(new Uint8Array(buffer));
            } catch {
                // PDF bytes loading failed — editing won't be available
            } finally {
                setLoading(false);
            }
        }
        loadPdf();
    });

    if (editMode && pdfBytes) {
        return (
            <PdfFormEditor
                pdfBytes={pdfBytes}
                documentId={documentId}
                onBack={() => setEditMode(false)}
                onSaveComplete={() => {
                    setEditMode(false);
                    onSaveComplete?.();
                }}
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-100">
            {/* Toolbar */}
            <div className="flex items-center justify-end px-3 py-2 bg-white border-b shrink-0">
                <button
                    onClick={() => setEditMode(true)}
                    disabled={!pdfBytes || loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
                    title={pdfBytes ? "Edit form fields" : "Loading PDF..."}
                >
                    {editMode ? (
                        <>
                            <Eye className="w-3.5 h-3.5" />
                            View
                        </>
                    ) : (
                        <>
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit Form
                        </>
                    )}
                </button>
            </div>

            {/* PDF via native browser viewer */}
            <iframe
                src={`${url}#toolbar=1&navpanes=0`}
                className="flex-1 w-full h-full border-0"
                title="PDF Document Viewer"
            />
        </div>
    );
}
