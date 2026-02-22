import { useState } from "react";
import { SourceCitations } from "./SourceCitations";
import { ImagePreviewModal } from "./ImagePreviewModal";
import type { ChatMessage } from "@/types";
import { formatDate } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [previewModalSrc, setPreviewModalSrc] = useState<string | null>(null);

  return (
    <>
      <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[85%] ${isUser
              ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
              : "bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-tl-sm shadow-sm"
            } px-4 py-3 flex flex-col gap-2`}
        >
          {message.images && message.images.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {message.images.map((img, i) => {
                const src = `data:${img.mime_type};base64,${img.data}`;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt="attachment"
                    className="max-w-[150px] max-h-[150px] object-cover rounded-lg cursor-pointer hover:opacity-90"
                    onClick={() => setPreviewModalSrc(src)}
                  />
                );
              })}
            </div>
          )}
          {message.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}
          {!isUser && message.sources && message.sources.length > 0 && (
            <SourceCitations sources={message.sources} />
          )}
          <p
            className={`text-xs mt-1 ${isUser ? "text-blue-200" : "text-muted-foreground"
              }`}
          >
            {formatDate(message.created_at)}
          </p>
        </div>
        {previewModalSrc && (
          <ImagePreviewModal
            imgSrc={previewModalSrc}
            onClose={() => setPreviewModalSrc(null)}
          />
        )}
      </div>
    </>
  );
}
