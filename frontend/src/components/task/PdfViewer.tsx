"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Download,
    Loader2,
    MapPin,
    X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PdfViewerProps {
    url: string;
    documentId?: string;
}

interface HighlightData {
    page: number;
    bbox: [number, number, number, number]; // [x0, y0, x1, y1] in PDF points (612×792)
    label?: string;
    method?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Standard US Letter page size in PDF points */
const PDF_PAGE_WIDTH = 612;
const PDF_PAGE_HEIGHT = 792;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PdfViewer({ url, documentId }: PdfViewerProps) {
    const iframeContainerRef = useRef<HTMLDivElement>(null);

    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [activeHighlight, setActiveHighlight] = useState<HighlightData | null>(null);
    const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

    /* ---- Build iframe URL with page hash ---- */
    const iframeSrc = (() => {
        const base = url;
        const page = activeHighlight?.page || 1;
        return `${base}#toolbar=0&navpanes=0&page=${page}&view=FitH`;
    })();

    /* ---- Track iframe container size for overlay calculations ---- */
    useEffect(() => {
        const container = iframeContainerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    /* ---- Listen for highlight events from the AI chat ---- */
    useEffect(() => {
        const handleHighlight = (e: Event) => {
            const detail = (e as CustomEvent).detail as HighlightData;
            console.log("[PDFVIEWER] Received highlight event:", detail);
            if (detail?.label) {
                setActiveHighlight(detail);
            }
        };

        const handleJump = (e: Event) => {
            const { page } = (e as CustomEvent).detail;
            console.log("[PDFVIEWER] Jump to page:", page);
        };

        window.addEventListener("show-highlight", handleHighlight);
        window.addEventListener("jump-to-page", handleJump);
        return () => {
            window.removeEventListener("show-highlight", handleHighlight);
            window.removeEventListener("jump-to-page", handleJump);
        };
    }, []);

    /* ---- Download handler ---- */
    const handleDownload = useCallback(async () => {
        try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "form-1040.pdf";
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (err) {
            console.error("Download failed:", err);
        }
    }, [url]);

    /* ---- Compute highlight overlay position ---- */
    const highlightOverlay = (() => {
        if (!activeHighlight || !containerSize) return null;

        const [x0, y0, x1, y1] = activeHighlight.bbox;

        // When FitH, the PDF width fills the container width
        const scale = containerSize.width / PDF_PAGE_WIDTH;

        // Calculate page offset for multi-page (each page stacks vertically with ~8px gap)
        const pageGap = 8 * scale;
        const pageOffset = (activeHighlight.page - 1) * (PDF_PAGE_HEIGHT * scale + pageGap);

        return {
            left: x0 * scale,
            top: y0 * scale + pageOffset,
            width: (x1 - x0) * scale,
            height: (y1 - y0) * scale,
        };
    })();

    return (
        <div className="flex flex-col h-full w-full bg-gray-100">
            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-3 py-2 bg-white border-b shrink-0">
                <span className="text-xs text-gray-500 font-medium">
                    PDF Viewer — Click any field to type directly
                </span>
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    title="Download PDF"
                >
                    <Download className="w-3.5 h-3.5" />
                    Download
                </button>
            </div>

            {/* ── Highlight notification banner ── */}
            {activeHighlight && (
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 flex-1">
                        <div className="bg-blue-600 rounded-full p-1">
                            <MapPin className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-blue-800">
                                {activeHighlight.label}
                            </span>
                            <span className="text-xs text-blue-600 ml-2">
                                Page {activeHighlight.page}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveHighlight(null)}
                        className="p-1 rounded hover:bg-blue-100 transition-colors"
                    >
                        <X className="w-4 h-4 text-blue-500" />
                    </button>
                </div>
            )}

            {/* ── Loading indicator ── */}
            {!iframeLoaded && (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        <span className="text-sm text-gray-500">Loading PDF…</span>
                    </div>
                </div>
            )}

            {/* ── PDF container (iframe + highlight overlay) ── */}
            <div
                ref={iframeContainerRef}
                className={`flex-1 relative ${iframeLoaded ? "" : "hidden"}`}
            >
                {/* Native PDF viewer */}
                <iframe
                    src={iframeSrc}
                    className="w-full h-full border-0"
                    onLoad={() => setIframeLoaded(true)}
                    title="PDF Document"
                />

                {/* Highlight overlay — sits ON TOP of the PDF, pointer-events: none so clicks pass through */}
                {highlightOverlay && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                        {/* Pulsating highlight box */}
                        <div
                            className="absolute rounded-sm"
                            style={{
                                left: highlightOverlay.left,
                                top: highlightOverlay.top,
                                width: highlightOverlay.width,
                                height: highlightOverlay.height,
                                border: "3px solid #3b82f6",
                                backgroundColor: "rgba(59, 130, 246, 0.18)",
                                boxShadow: "0 0 16px rgba(59, 130, 246, 0.6), 0 0 32px rgba(59, 130, 246, 0.25)",
                                animation: "highlight-pulse 1.5s ease-in-out infinite",
                            }}
                        />

                        {/* Label tooltip above the highlight */}
                        {activeHighlight?.label && (
                            <div
                                className="absolute"
                                style={{
                                    left: highlightOverlay.left + highlightOverlay.width / 2,
                                    top: highlightOverlay.top - 34,
                                    transform: "translateX(-50%)",
                                }}
                            >
                                <div className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1.5">
                                    <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                    {activeHighlight.label}
                                    {/* Arrow pointing down */}
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 rotate-45" />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Keyframe animation */}
            <style dangerouslySetInnerHTML={{
                __html: `
              @keyframes highlight-pulse {
                0%, 100% { border-color: #3b82f6; box-shadow: 0 0 16px rgba(59,130,246,0.6), 0 0 32px rgba(59,130,246,0.25); }
                50% { border-color: #60a5fa; box-shadow: 0 0 24px rgba(59,130,246,0.8), 0 0 48px rgba(59,130,246,0.35); }
              }
            `}} />
        </div>
    );
}
