"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Mic } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendChatMessage, summarizeDocument } from "@/lib/api/fastapi";
import { MessageBubble } from "./MessageBubble";
import { LanguageSelector } from "./LanguageSelector";
import type { ChatMessage, Document, Source } from "@/types";

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
  const [statusStage, setStatusStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const STAGE_LABELS: Record<string, string> = {
    reading_document: "Reading document…",
    building_chunks: "Building chunks…",
    checking_rag_db: "Checking RAG database…",
    selecting_sources: "Selecting sources…",
    writing_answer: "Writing answer…",
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const supabase = getSupabaseBrowserClient();

  // Poll ingestion status until ready
  const [ingestStatus, setIngestStatus] = useState(doc?.ingest_status || "pending");

  useEffect(() => {
    if (isGeneralMode || !doc || ingestStatus === "ready" || ingestStatus === "error") return;

    let timer: NodeJS.Timeout;
    async function checkStatus() {
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("ingest_status")
          .eq("id", doc!.id)
          .maybeSingle();

        if (data?.ingest_status) {
          setIngestStatus(data.ingest_status);
        }
      } catch (err) {
        console.error("Error polling ingestion status:", err);
      }

      if (ingestStatus !== "ready" && ingestStatus !== "error") {
        timer = setTimeout(checkStatus, 3000);
      }
    }

    checkStatus();
    return () => clearTimeout(timer);
  }, [doc, ingestStatus, isGeneralMode, supabase]);

  // Load existing chat history or trigger summary when ready
  useEffect(() => {
    async function initChat() {
      // 1. Get or create chat session
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
      let currentChatId: string | undefined;

      if (chats && chats.length > 0) {
        currentChatId = chats[0].id;
        setChatId(currentChatId);
      }

      // 2. Load messages if chat session exists
      if (currentChatId) {
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("chat_id", currentChatId)
          .order("created_at", { ascending: true });

        const existing = (msgs as ChatMessage[]) ?? [];
        setMessages(existing);

        // If we have messages, we are done
        if (existing.length > 0) return;
      }

      // 3. For doc mode, if empty, wait for ingestion and then summary
      if (doc && autoSummarize) {
        if (ingestStatus === "ready") {
          runAutoSummarize(currentChatId);
        }
      }
    }

    async function runAutoSummarize(existingChatId: string | undefined) {
      setSummarizing(true);
      setError(null);
      setStatusStage("reading_document");
      try {
        // Double check if summary arrived in the background
        if (existingChatId) {
          const { data: messages } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("chat_id", existingChatId);

          const msgRes = (messages || []).find((m: any) => m.metadata?.auto_summary);

          if (msgRes) {
            setMessages([msgRes as ChatMessage]);
            if (!chatId) setChatId(existingChatId);
            setSummarizing(false);
            setStatusStage(null);
            return;
          }
        }

        const response = await summarizeDocument({
          document_id: doc!.id,
          language,
        });

        if (!response.body) throw new Error("No response body");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          chat_id: existingChatId || "",
          user_id: "",
          role: "assistant",
          content: "",
          lang: language,
          sources: [],
          status: "thinking",
          created_at: new Date().toISOString(),
        };

        setMessages([assistantMessage]);

        let done = false;
        let buffer = "";
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);
                if (data.type === "meta" && data.chat_id) {
                  setChatId(data.chat_id);
                  assistantMessage.chat_id = data.chat_id;
                }
                if (data.type === "status") {
                  setStatusStage(data.stage);
                }
                if (data.type === "sources") {
                  assistantMessage.sources = data.sources;
                }
                if (data.type === "answer_token") {
                  assistantMessage.status = "responding";
                  assistantMessage.content += data.text;
                }
                if (data.type === "done") {
                  assistantMessage.status = "done";
                  setStatusStage(null);
                  done = true;
                }
                setMessages([assistantMessage]);
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Could not load document summary"
        );
      } finally {
        setSummarizing(false);
        setStatusStage(null);
      }
    }

    initChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, ingestStatus]);

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
    setStatusStage("reading_document");

    try {
      const response = await sendChatMessage({
        ...(doc ? { document_id: doc.id } : {}),
        chat_id: chatId,
        question: userMessage.content,
        language,
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        chat_id: chatId ?? "",
        user_id: "",
        role: "assistant",
        content: "",
        lang: language,
        sources: [],
        status: "thinking",
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      let done = false;
      let buffer = "";
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.type === "meta" && data.chat_id) {
                if (!chatId) setChatId(data.chat_id);
                assistantMessage.chat_id = data.chat_id;
              }
              if (data.type === "status") {
                setStatusStage(data.stage);
              }
              if (data.type === "sources") {
                assistantMessage.sources = data.sources;
              }
              if (data.type === "answer_token") {
                assistantMessage.status = "responding";
                assistantMessage.content += data.text;
              }
              if (data.type === "done") {
                assistantMessage.status = "done";
                setStatusStage(null);
                done = true;
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessage.id ? { ...assistantMessage } : m
                )
              );
            } catch (e) {
              console.error("Parse error:", e);
            }
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setStatusStage(null);
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-white">
        <div>
          {isGeneralMode ? (
            <>
              <p className="text-sm font-semibold text-[#0F172A]">General Tax Help</p>
              <p className="text-xs text-[#64748B]">
                Ask any US tax question
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#0F172A] truncate max-w-[250px]">
                {doc!.filename}
              </p>
              <p className="text-xs text-[#64748B]">
                Ask anything about this document
              </p>
            </>
          )}
        </div>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
        {messages.length === 0 && !summarizing && (
          <div className="text-center py-12 text-[#64748B]">
            {isGeneralMode ? (
              <>
                <p className="text-sm font-semibold mb-2">
                  Ask any US tax question
                </p>
                <p className="text-xs">
                  Try: &quot;Do I need to file Form 8843?&quot; or
                  &quot;What is a W-2?&quot;
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold mb-2">
                  {(ingestStatus !== "ready" || statusStage) ? "Analyzing your document…" : "Start chatting…"}
                </p>
                <p className="text-xs">
                  {statusStage
                    ? STAGE_LABELS[statusStage as keyof typeof STAGE_LABELS] || "Processing..."
                    : (ingestStatus !== "ready" || (autoSummarize && messages.length === 0))
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

        {(loading || summarizing || statusStage || (doc && ingestStatus !== "ready")) && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-tl-sm px-4 py-3 shadow-ct-card">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#64748B] mr-1">
                  {statusStage
                    ? STAGE_LABELS[statusStage as keyof typeof STAGE_LABELS]
                    : ingestStatus !== "ready"
                      ? "Analyzing document…"
                      : loading
                        ? "Thinking…"
                        : "Reading document…"}
                </span>
                <div className="flex gap-1">
                  <span
                    className="w-2 h-2 bg-[#2F8AE5]/50 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-[#2F8AE5]/50 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-[#2F8AE5]/50 rounded-full animate-bounce"
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
      <form onSubmit={handleSend} className="border-t border-[#E2E8F0] bg-white p-4">
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              isListening
                ? "Listening..."
                : statusStage
                  ? STAGE_LABELS[statusStage as keyof typeof STAGE_LABELS] || "Processing..."
                  : summarizing
                    ? "Reading document…"
                    : isGeneralMode
                      ? "Ask a tax question…"
                      : "Ask about your document…"
            }
            disabled={loading || summarizing || isListening}
            className="flex-1 pl-3 pr-10 py-2 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-sm text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2F8AE5]/40 focus:border-[#2F8AE5] disabled:opacity-50 transition-all duration-200"
          />
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading || summarizing}
            className={`absolute right-12 top-1.5 p-1.5 rounded-lg transition-all duration-200 ${isListening
              ? "text-red-600 bg-red-100 animate-pulse"
              : "text-[#64748B] hover:text-[#2F8AE5] hover:bg-[#2F8AE5]/8"
              } disabled:opacity-50`}
            title={isListening ? "Stop listening" : "Start dictating"}
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!question.trim() || loading || summarizing || isListening}
            className="p-2 bg-gradient-to-r from-[#2F8AE5] to-[#7DB3E8] text-white rounded-xl shadow-ct-sm hover:opacity-90 disabled:opacity-50 transition-all duration-200"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
