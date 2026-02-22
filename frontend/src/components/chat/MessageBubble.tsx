import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SourceCitations } from "./SourceCitations";
import { ImagePreviewModal } from "./ImagePreviewModal";
import type { ChatMessage } from "@/types";
import { formatDate } from "@/lib/utils";
import { useTypewriter } from "@/hooks/useTypewriter";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [previewModalSrc, setPreviewModalSrc] = useState<string | null>(null);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const [ellipsis, setEllipsis] = useState("");
  const [elapsed, setElapsed] = useState(0);

  // Auto-collapse plan when thinking is done
  useEffect(() => {
    if (message.status !== "thinking" && isPlanExpanded) {
      setIsPlanExpanded(false);
    }
  }, [message.status]);

  // Use typewriter for assistant messages that were recently streaming
  // If the message is already 'done' when this component mounts (e.g. from history), 
  // we might want it to be instant. For now, let's assume if it has status 'done' AND 
  // content exists, we might want to check if it's "fresh".
  // A simple heuristic: if it's already 'done', skip typewriter?
  const isFresh = message.status !== "done";
  const { displayedText } = useTypewriter(
    message.content,
    message.status === "done",
    { speed: 20, charsPerTick: 3 }
  );

  // Typewriter for PLAN - bigger chunks but slower feel
  const { displayedText: displayedPlan } = useTypewriter(
    message.plan || "",
    message.status === "responding" || message.status === "done",
    { speed: 40, charsPerTick: 4 } // Slower than before for "human" feel
  );

  const finalContent = isUser || !isFresh ? message.content : displayedText;
  const finalPlan = !isFresh ? message.plan : displayedPlan;

  // Timer for thinking duration
  useEffect(() => {
    if (message.status !== "thinking" || !message.thinkingStartTime) {
      setElapsed(message.thinkingDuration || 0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - (message.thinkingStartTime || 0)) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [message.status, message.thinkingStartTime, message.thinkingDuration]);

  // Ellipsis animation for thinking state
  useEffect(() => {
    if (message.status !== "thinking" && message.status !== "responding") {
      setEllipsis("");
      return;
    }
    const interval = setInterval(() => {
      setEllipsis((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [message.status]);

  const isStreaming = message.status === "thinking" || message.status === "responding";
  const showHeader = !isUser && (isStreaming || message.hasPlan || message.thinkingDuration);

  // Labels
  const showTimer = elapsed >= 2;
  const thinkingLabel = message.status === "thinking"
    ? `Thinking${showTimer ? ` for ${elapsed}s` : "..."}`
    : (message.thinkingDuration ? `Thought for ${message.thinkingDuration}s` : "Assistant");

  return (
    <>
      <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
        <div
          className={`max-w-[90%] md:max-w-[80%] ${isUser
            ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
            : "bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-tl-sm shadow-sm"
            } px-4 py-3 flex flex-col gap-2 transition-all duration-300`}
        >
          {/* Images Section */}
          {message.images && message.images.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-1">
              {message.images.map((img, i) => {
                const src = `data:${img.mime_type};base64,${img.data}`;
                return (
                  <img
                    key={i}
                    src={src}
                    alt="attachment"
                    className="max-w-[120px] max-h-[120px] object-cover rounded-lg cursor-pointer hover:opacity-90 border border-gray-100"
                    onClick={() => setPreviewModalSrc(src)}
                  />
                );
              })}
            </div>
          )}

          {/* Assistant Header (Thinking/Thought + Plan Toggle) */}
          {showHeader && (
            <div className="flex flex-col gap-1 py-0.5 border-b border-gray-50 mb-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-500 flex items-center min-w-[70px]">
                    {thinkingLabel}
                    {message.status === "thinking" && <span className="inline-block w-4">{ellipsis}</span>}
                  </span>
                </div>

                {/* Always show toggle for assistant if it has a plan OR is currently thinking/responding */}
                {(message.hasPlan || isStreaming) && (
                  <button
                    onClick={() => setIsPlanExpanded(!isPlanExpanded)}
                    className="flex items-center text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1"
                    title={isPlanExpanded ? "Collapse Plan" : "Expand Plan"}
                  >
                    {isPlanExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Generating Sub-header */}
              {message.status === "responding" && (
                <div className="flex items-center gap-1 animate-in fade-in duration-500">
                  <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider flex items-center">
                    Generating
                    <span className="inline-block w-4">{ellipsis}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Plan Section */}
          {isPlanExpanded && (
            <div className="mb-2 p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] text-gray-600 animate-in fade-in slide-in-from-top-1 duration-200">
              {!finalPlan ? (
                <div className="flex items-center gap-1.5 text-gray-400 italic py-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gray-300"></span>
                  </span>
                  Planning steps...
                </div>
              ) : (
                <div className="prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-1 prose-li:my-0.5 line-height-tight">
                  {finalPlan.split("\n").filter(l => l.trim()).map((line, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-blue-400 select-none">•</span>
                      <span>{line.replace(/^[•\s*-]+/, '')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Message Content */}
          {finalContent && (
            <div className="text-[14px] leading-relaxed whitespace-pre-wrap text-gray-800">
              {finalContent}
            </div>
          )}

          {/* Citations */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-1 pt-2 border-t border-gray-50">
              <SourceCitations sources={message.sources} />
            </div>
          )}

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
