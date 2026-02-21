import { SourceCitations } from "./SourceCitations";
import type { ChatMessage } from "@/types";
import { formatDate } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] ${
          isUser
            ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
            : "bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-tl-sm shadow-sm"
        } px-4 py-3`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceCitations sources={message.sources} />
        )}
        <p
          className={`text-xs mt-1 ${
            isUser ? "text-blue-200" : "text-muted-foreground"
          }`}
        >
          {formatDate(message.created_at)}
        </p>
      </div>
    </div>
  );
}
