"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PdfViewerProps {
    url: string;
    documentId?: string;
    onSaveComplete?: () => void;
}

interface HighlightData {
    page: number;
    bbox: [number, number, number, number]; // [x0, top, x1, bottom] in PDF points
    label?: string;
    method?: string;
}

/* ------------------------------------------------------------------ */
/*  PDF.js CDN loader                                                  */
/* ------------------------------------------------------------------ */

const PDFJS_VERSION = "3.11.174";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

/**
 * Dynamically loads the PDF.js library from CDN.
 * Returns the global `pdfjsLib` object once ready.
 */
function loadPdfJs(): Promise<any> {
    return new Promise((resolve, reject) => {
        // Already loaded?
        if ((window as any).pdfjsLib) {
            return resolve((window as any).pdfjsLib);
        }

        const script = document.createElement("script");
        script.src = `${PDFJS_CDN}/pdf.min.js`;
        script.type = "text/javascript";

        script.onload = () => {
            const lib = (window as any).pdfjsLib;
            if (!lib) {
                reject(new Error("pdfjsLib not found after script load"));
                return;
            }
            lib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
            resolve(lib);
        };
        script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
        document.head.appendChild(script);
    });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PdfViewer({ url }: PdfViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.2);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeHighlight, setActiveHighlight] = useState<HighlightData | null>(null);

    // Track page dimensions for overlay positioning
    const [pageDims, setPageDims] = useState<{ width: number; height: number; pdfWidth: number; pdfHeight: number } | null>(null);

    /* ---- Load PDF.js + document ---- */
    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                setLoading(true);
                setError(null);
                const pdfjsLib = await loadPdfJs();
                const doc = await pdfjsLib.getDocument(url).promise;
                if (cancelled) return;
                setPdfDoc(doc);
                setNumPages(doc.numPages);
            } catch (err: any) {
                if (!cancelled) setError(err?.message || "Failed to load PDF");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        init();
        return () => { cancelled = true; };
    }, [url]);

    /* ---- Render current page to canvas ---- */
    const renderPage = useCallback(async () => {
        if (!pdfDoc || !canvasRef.current) return;

        try {
            const page = await pdfDoc.getPage(pageNumber);
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            // Set canvas size to match viewport
            const dpr = window.devicePixelRatio || 1;
            canvas.width = viewport.width * dpr;
            canvas.height = viewport.height * dpr;
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Store dimensions for overlay calculation
            setPageDims({
                width: viewport.width,
                height: viewport.height,
                pdfWidth: page.getViewport({ scale: 1 }).width,
                pdfHeight: page.getViewport({ scale: 1 }).height,
            });

            await page.render({ canvasContext: ctx, viewport }).promise;
        } catch (err) {
            console.error("Error rendering page:", err);
        }
    }, [pdfDoc, pageNumber, scale]);

    useEffect(() => {
        renderPage();
    }, [renderPage]);

    /* ---- Listen for highlight + jump events ---- */
    useEffect(() => {
        const handleHighlight = (e: Event) => {
            const detail = (e as CustomEvent).detail as HighlightData;
            console.log("[PDFVIEWER] Received show-highlight event:", detail);
            setActiveHighlight(detail);
            if (detail.page) {
                setPageNumber(detail.page);
            }
        };

        const handleJump = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail.page) {
                setPageNumber(detail.page);
                setActiveHighlight(null);
            }
        };

        window.addEventListener("show-highlight", handleHighlight);
        window.addEventListener("jump-to-page", handleJump);
        return () => {
            window.removeEventListener("show-highlight", handleHighlight);
            window.removeEventListener("jump-to-page", handleJump);
        };
    }, []);

    /* ---- Navigation helpers ---- */
    const goToPrev = () => setPageNumber((p) => Math.max(1, p - 1));
    const goToNext = () => setPageNumber((p) => Math.min(numPages, p + 1));
    const zoomIn = () => setScale((s) => Math.min(3, +(s + 0.2).toFixed(1)));
    const zoomOut = () => setScale((s) => Math.max(0.4, +(s - 0.2).toFixed(1)));

    /* ---- Compute highlight overlay position (PDF points → CSS pixels) ---- */
    const highlightStyle = (() => {
        if (!activeHighlight || !pageDims || activeHighlight.page !== pageNumber) return null;
        const [x0, top, x1, bottom] = activeHighlight.bbox;
        const sx = pageDims.width / pageDims.pdfWidth;
        const sy = pageDims.height / pageDims.pdfHeight;

        return {
            left: x0 * sx,
            top: top * sy,
            width: (x1 - x0) * sx,
            height: (bottom - top) * sy,
        };
    })();

    /* ---- Loading / error states ---- */
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="text-sm text-gray-500">Loading PDF…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-sm text-red-500">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-gray-100">
            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between px-3 py-2 bg-white border-b shrink-0">
                {/* Page nav */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={goToPrev}
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
                        onClick={goToNext}
                        disabled={pageNumber >= numPages}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                        title="Next page"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Zoom */}
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
            </div>

            {/* ── Canvas + Overlay ── */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto flex justify-center p-4"
            >
                <div className="relative inline-block shadow-lg">
                    <canvas ref={canvasRef} />

                    {/* Highlight bounding box overlay */}
                    {highlightStyle && (
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{ width: pageDims?.width, height: pageDims?.height }}
                        >
                            {/* Pulsating bounding box */}
                            <div
                                className="absolute rounded-sm"
                                style={{
                                    left: highlightStyle.left,
                                    top: highlightStyle.top,
                                    width: highlightStyle.width,
                                    height: highlightStyle.height,
                                    border: "3px solid #3b82f6",
                                    backgroundColor: "rgba(59, 130, 246, 0.15)",
                                    boxShadow: "0 0 12px rgba(59, 130, 246, 0.5), 0 0 24px rgba(59, 130, 246, 0.2)",
                                    animation: "highlight-pulse 1.5s ease-in-out infinite",
                                }}
                            />

                            {/* Label tooltip */}
                            {activeHighlight?.label && (
                                <div
                                    className="absolute"
                                    style={{
                                        left: highlightStyle.left + highlightStyle.width / 2,
                                        top: highlightStyle.top - 36,
                                        transform: "translateX(-50%)",
                                    }}
                                >
                                    <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                        {activeHighlight.label}
                                        <button
                                            onClick={() => setActiveHighlight(null)}
                                            className="ml-1 text-blue-200 hover:text-white pointer-events-auto"
                                        >
                                            ✕
                                        </button>
                                        {/* Arrow */}
                                        <div
                                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 rotate-45"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Keyframe animation injected via style tag */}
            <style jsx>{`
        @keyframes highlight-pulse {
          0%, 100% {
            border-color: #3b82f6;
            box-shadow: 0 0 12px rgba(59, 130, 246, 0.5), 0 0 24px rgba(59, 130, 246, 0.2);
          }
          50% {
            border-color: #60a5fa;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.7), 0 0 40px rgba(59, 130, 246, 0.3);
          }
        }
      `}</style>
        </div>
    );
}
