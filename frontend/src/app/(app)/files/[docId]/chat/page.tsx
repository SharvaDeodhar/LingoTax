import { redirect, notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ChatInterface } from "@/components/chat/ChatInterface";
import type { Document, Profile } from "@/types";

interface ChatPageProps {
  params: { docId: string };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch document — RLS ensures this user owns it
  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", params.docId)
    .eq("user_id", user.id)
    .single();

  if (!doc) notFound();

  if (doc.ingest_status !== "ready") {
    redirect(`/files?status=${doc.ingest_status}`);
  }

  // Get user's preferred language from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("user_id", user.id)
    .single();

  const preferredLanguage = (profile as Profile | null)?.preferred_language ?? "en";

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ChatInterface
        document={doc as Document}
        preferredLanguage={preferredLanguage}
      />
    </div>
  );
}
