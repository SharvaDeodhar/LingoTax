"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Mic } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendChatMessage } from "@/lib/api/fastapi";
import { MessageBubble } from "./MessageBubble";
import { LanguageSelector } from "./LanguageSelector";
import type { ChatMessage, Document } from "@/types";

interface ChatInterfaceProps {
  document?: Document; // omit for general tax help mode
  preferredLanguage: string;
  autoSummarize?: boolean;
}

export function ChatInterface({
  document: doc,
  preferredLanguage,
  autoSummarize = false,
}: ChatInterfaceProps) {
  const isGeneralMode = !doc;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | undefined>();
  const [language, setLanguage] = useState(preferredLanguage);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const supabase = getSupabaseBrowserClient();

  // Load existing chat history; optionally auto-summarize on first open of a document chat
  useEffect(() => {
    async function loadHistory() {
      let query = supabase
        .from("chats")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1);

      if (doc) {
        query = query.eq("document_id", doc.id);
      } else {
        query = query.is("document_id", null);
      }

      const { data: chats } = await query;

      if (chats && chats.length > 0) {
        const existingChatId = chats[0].id;
        setChatId(existingChatId);

        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("chat_id", existingChatId)
          .order("created_at", { ascending: true });

        const existing = (msgs as ChatMessage[]) ?? [];
        setMessages(existing);

        // Auto-summarize only for doc chats, only if enabled, only if empty
        if (doc && autoSummarize && existing.length === 0) {
          runAutoSummarize(existingChatId);
        }
      } else if (doc && autoSummarize) {
        // No chat session at all — auto-summarize will create one
        runAutoSummarize(undefined);
      }
    }

    async function runAutoSummarize(existingChatId: string | undefined) {
      setSummarizing(true);
      setError(null);
      try {
        const response = await sendChatMessage({
          document_id: doc!.id,
          chat_id: existingChatId,
          question: "__summarize__",
          language,
        });

        setChatId(response.chat_id);

        setMessages([
          {
            id: crypto.randomUUID(),
            chat_id: response.chat_id,
            user_id: "",
            role: "assistant",
            content: response.answer,
            lang: language,
            sources: [],
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Could not load document summary"
        );
      } finally {
        setSummarizing(false);
      }
    }

    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading || summarizing) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      chat_id: chatId ?? "",
      user_id: "",
      role: "user",
      content: question,
      lang: language,
      sources: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      const response = await sendChatMessage({
        ...(doc ? { document_id: doc.id } : {}),
        chat_id: chatId,
        question: userMessage.content,
        language,
      });

      if (!chatId) setChatId(response.chat_id);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        chat_id: response.chat_id,
        user_id: "",
        role: "assistant",
        content: response.answer,
        lang: language,
        sources: response.sources ?? [],
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      // @ts-ignore
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError("Speech recognition is not supported in this browser.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language === "en" ? "en-US" : language;
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setQuestion(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to start speech recognition.");
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div>
          {isGeneralMode ? (
            <>
              <p className="text-sm font-medium">General Tax Help</p>
              <p className="text-xs text-muted-foreground">
                Ask any US tax question
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium truncate max-w-[250px]">
                {doc!.filename}
              </p>
              <p className="text-xs text-muted-foreground">
                Ask anything about this document
              </p>
            </>
          )}
        </div>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && !summarizing && (
          <div className="text-center py-12 text-muted-foreground">
            {isGeneralMode ? (
              <>
                <p className="text-sm font-medium mb-2">
                  Ask any US tax question
                </p>
                <p className="text-xs">
                  Try: &quot;Do I need to file Form 8843?&quot; or
                  &quot;What is a W-2?&quot;
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium mb-2">
                  {autoSummarize ? "Analyzing your document…" : "Start chatting…"}
                </p>
                <p className="text-xs">
                  {autoSummarize
                    ? "Your document breakdown will appear shortly"
                    : "Ask a question about the document above"}
                </p>
              </>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {(loading || summarizing) && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                {summarizing && (
                  <span className="text-xs text-muted-foreground">
                    Reading document…
                  </span>
                )}
                <div className="flex gap-1">
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="border-t bg-white p-4">
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              isListening
                ? "Listening..."
                : summarizing
                ? "Reading document…"
                : isGeneralMode
                ? "Ask a tax question…"
                : "Ask about your document…"
            }
            disabled={loading || summarizing || isListening}
            className="flex-1 pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading || summarizing}
            className={`absolute right-12 top-1.5 p-1.5 rounded-md transition-colors ${
              isListening
                ? "text-red-600 bg-red-100 animate-pulse"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            } disabled:opacity-50`}
            title={isListening ? "Stop listening" : "Start dictating"}
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!question.trim() || loading || summarizing || isListening}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}