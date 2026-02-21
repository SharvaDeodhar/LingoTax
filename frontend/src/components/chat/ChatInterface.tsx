"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendChatMessage } from "@/lib/api/fastapi";
import { MessageBubble } from "./MessageBubble";
import { LanguageSelector } from "./LanguageSelector";
import type { ChatMessage, Document } from "@/types";

interface ChatInterfaceProps {
  document: Document;
  preferredLanguage: string;
}

export function ChatInterface({ document: doc, preferredLanguage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | undefined>();
  const [language, setLanguage] = useState(preferredLanguage);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const supabase = getSupabaseBrowserClient();

  // Load existing chat history
  useEffect(() => {
    async function loadHistory() {
      const { data: chats } = await supabase
        .from("chats")
        .select("id")
        .eq("document_id", doc.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!chats || chats.length === 0) return;

      const existingChatId = chats[0].id;
      setChatId(existingChatId);

      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", existingChatId)
        .order("created_at", { ascending: true });

      setMessages((msgs as ChatMessage[]) ?? []);
    }

    loadHistory();
  }, [doc.id, supabase]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;

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
        document_id: doc.id,
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
        sources: response.sources,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div>
          <p className="text-sm font-medium truncate max-w-[250px]">{doc.filename}</p>
          <p className="text-xs text-muted-foreground">Ask anything about this document</p>
        </div>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm font-medium mb-2">Start chatting about your document</p>
            <p className="text-xs">Try: &quot;What are my wages?&quot; or &quot;What is Box 2?&quot;</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your document…"
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
