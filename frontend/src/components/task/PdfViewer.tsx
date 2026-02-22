"use client";

interface PdfViewerProps {
    url: string;
}

export function PdfViewer({ url }: PdfViewerProps) {
    return (
        <iframe
            src={url}
            className="w-full h-full border-0"
            title="Tax document PDF"
        />
    );
}
