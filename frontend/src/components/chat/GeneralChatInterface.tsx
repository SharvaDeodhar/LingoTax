"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Mic, Plus, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendGeneralChatMessage } from "@/lib/api/fastapi";
import { MessageBubble } from "./MessageBubble";
import { LanguageSelector } from "./LanguageSelector";
import { ImagePreviewModal } from "./ImagePreviewModal";
import type { ChatMessage } from "@/types";

interface GeneralChatInterfaceProps {
  preferredLanguage: string;
}

export function GeneralChatInterface({
  preferredLanguage,
}: GeneralChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | undefined>();
  const [language, setLanguage] = useState(preferredLanguage);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [attachedImages, setAttachedImages] = useState<{ id: string; file: File; previewUrl: string }[]>([]);
  const [previewModalSrc, setPreviewModalSrc] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGES = 3;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const supabase = getSupabaseBrowserClient();

  // Load latest general chat history (where document_id IS NULL)
  useEffect(() => {
    async function loadHistory() {
      const { data: chats } = await supabase
        .from("chats")
        .select("id")
        .is("document_id", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!chats || chats.length === 0) return;

      const existingChatId = chats[0].id as string;
      setChatId(existingChatId);

      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", existingChatId)
        .order("created_at", { ascending: true });

      setMessages((msgs as ChatMessage[]) ?? []);
    }

    loadHistory();
  }, [supabase]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() && attachedImages.length === 0) return;
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      // Convert attached images to base64
      const imagePayloads = await Promise.all(
        attachedImages.map(async (img) => {
          const buffer = await img.file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          return {
            data: base64,
            mime_type: img.file.type,
          };
        })
      );

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        chat_id: chatId ?? "",
        user_id: "",
        role: "user",
        content: question,
        lang: language,
        sources: [],
        images: imagePayloads.map(img => ({ data: img.data, mime_type: img.mime_type })),
        created_at: new Date().toISOString(),
      };

      setMessages((prev: ChatMessage[]) => [...prev, userMessage]);
      setQuestion("");
      const sentImages = [...attachedImages]; // copy to clear later but potentially retry on error?
      setAttachedImages([]); // clear UI

      // Cleanup object urls
      sentImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      const response = await sendGeneralChatMessage({
        chat_id: chatId,
        question: userMessage.content,
        language,
        images: imagePayloads.length > 0 ? imagePayloads : undefined,
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
        isThinking: true,
        hasPlan: false,
        status: "thinking",
        thinkingStartTime: Date.now(),
        created_at: new Date().toISOString(),
      };

      setMessages((prev: ChatMessage[]) => [...prev, assistantMessage]);

      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // retain incomplete line

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);

              if (data.type === "meta" && data.chat_id) {
                if (!chatId) setChatId(data.chat_id);
                assistantMessage.chat_id = data.chat_id;
              }

              if (data.type === "thinking") {
                const isStart = data.status === "start";
                assistantMessage.isThinking = isStart;
                if (!isStart && assistantMessage.thinkingStartTime) {
                  assistantMessage.thinkingDuration = Math.round((Date.now() - assistantMessage.thinkingStartTime) / 1000);
                }
              }

              if (data.type === "status_update") {
                if (data.status === "responding") {
                  assistantMessage.status = "responding";
                  assistantMessage.isThinking = false;
                  // Ensure duration is set if thinking ended via transition
                  if (!assistantMessage.thinkingDuration && assistantMessage.thinkingStartTime) {
                    assistantMessage.thinkingDuration = Math.round((Date.now() - assistantMessage.thinkingStartTime) / 1000);
                  }
                }
              }

              if (data.type === "plan_token") {
                assistantMessage.plan = (assistantMessage.plan || "") + data.text;
                assistantMessage.hasPlan = true;
              }

              if (data.type === "answer_token") {
                if (assistantMessage.status === "thinking") {
                  assistantMessage.status = "responding";
                  assistantMessage.isThinking = false;
                  if (assistantMessage.thinkingStartTime && !assistantMessage.thinkingDuration) {
                    assistantMessage.thinkingDuration = Math.round((Date.now() - assistantMessage.thinkingStartTime) / 1000);
                  }
                }
                assistantMessage.content += data.text;
              }

              if (data.type === "done") {
                assistantMessage.status = "done";
                done = true;
              }

              // Update the specific message in the react state
              setMessages((prev: ChatMessage[]) =>
                prev.map((m: ChatMessage) =>
                  m.id === assistantMessage.id ? { ...assistantMessage } : m
                )
              );
            } catch (e) {
              console.error("Parse error on chunk:", line, e);
            }
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Handle image attachment
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    e.target.value = ""; // reset input

    if (attachedImages.length + files.length > MAX_IMAGES) {
      setError(`Too many images. Max ${MAX_IMAGES} allowed.`);
      return;
    }

    const validFiles = files.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        setError(`Image ${f.name} too large (max 5MB)`);
        return false;
      }
      return true;
    });

    const newImages = validFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setAttachedImages(prev => [...prev, ...newImages]);
    setError(null);
  };

  const removeAttachedImage = (id: string) => {
    setAttachedImages(prev => {
      const idx = prev.findIndex((img: any) => img.id === id);
      if (idx !== -1) URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((img: any) => img.id !== id);
    });
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      attachedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, [attachedImages]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
          <p className="text-sm font-medium">General Tax Help</p>
          <p className="text-xs text-muted-foreground">
            Ask questions about US taxes in your preferred language.
          </p>
        </div>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm font-medium mb-2">
              Start a conversation about your tax situation
            </p>
            <p className="text-xs">
              For example: &quot;Which tax forms do I usually need?&quot; or
              &quot;What is a W-2 form?&quot;
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-white p-4 flex flex-col gap-2">
        {/* Attached Images row */}
        {attachedImages.length > 0 && (
          <div className="flex gap-2 items-center flex-wrap px-1">
            {attachedImages.map((img) => (
              <div key={img.id} className="relative group rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center p-1 cursor-pointer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt="attachment"
                  className="h-12 w-12 object-cover rounded-sm"
                  onClick={() => setPreviewModalSrc(img.previewUrl)}
                />
                <button
                  onClick={() => removeAttachedImage(img.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSend}>
          <div className="flex gap-2 relative">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageSelect}
              disabled={loading || attachedImages.length >= MAX_IMAGES}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || attachedImages.length >= MAX_IMAGES}
              className="absolute left-1.5 top-1.5 p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-50 transition-colors z-10"
              title="Attach Images"
            >
              <Plus className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={isListening ? "Listening..." : "Ask a tax question…"}
              disabled={loading || isListening}
              className="flex-1 pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={toggleListening}
              disabled={loading}
              className={`absolute right-12 top-1.5 p-1.5 rounded-md transition-colors z-10 ${isListening ? "text-red-600 bg-red-100 animate-pulse" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                } disabled:opacity-50`}
              title={isListening ? "Stop listening" : "Start dictating"}
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={(!question.trim() && attachedImages.length === 0) || loading || isListening}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Image Modal */}
      {previewModalSrc && (
        <ImagePreviewModal
          imgSrc={previewModalSrc}
          onClose={() => setPreviewModalSrc(null)}
        />
      )}
    </div>
  );
}

