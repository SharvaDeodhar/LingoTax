"use client";

import { useCallback, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Edit3,
    Eye,
} from "lucide-react";
import { PdfFormEditor } from "./PdfFormEditor";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    url: string;
    documentId: string;
    onSaveComplete?: () => void;
}

export function PdfViewer({ url, documentId, onSaveComplete }: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [editMode, setEditMode] = useState(false);
    const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
    const [loading, setLoading] = useState(true);

    // Load PDF bytes for editing
    useEffect(() => {
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
    }, [url]);

    const onDocumentLoadSuccess = useCallback(
        ({ numPages: total }: { numPages: number }) => {
            setNumPages(total);
        },
        []
    );

    const goToPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
    const goToNextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));
    const zoomIn = () => setScale((s) => Math.min(2.5, s + 0.2));
    const zoomOut = () => setScale((s) => Math.max(0.4, s - 0.2));

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
            <div className="flex items-center justify-between px-3 py-2 bg-white border-b shrink-0">
                <div className="flex items-center gap-1">
                    <button
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                        title="Previous page"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-600 min-w-[60px] text-center">
                        {pageNumber} / {numPages || "—"}
                    </span>
                    <button
                        onClick={goToNextPage}
                        disabled={pageNumber >= numPages}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                        title="Next page"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={zoomOut}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        title="Zoom out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-600 min-w-[40px] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        onClick={zoomIn}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        title="Zoom in"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                </div>

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

            {/* PDF Page */}
            <div className="flex-1 overflow-auto flex justify-center p-4">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="flex items-center justify-center h-64">
                            <div className="text-sm text-gray-500">Loading PDF…</div>
                        </div>
                    }
                    error={
                        <div className="flex items-center justify-center h-64">
                            <div className="text-sm text-red-500">Failed to load PDF</div>
                        </div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        className="shadow-lg"
                        renderAnnotationLayer={true}
                        renderTextLayer={true}
                    />
                </Document>
            </div>
        </div>
    );
}
