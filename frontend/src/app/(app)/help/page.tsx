import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ChatInterface } from "@/components/chat/ChatInterface";
import type { Profile } from "@/types";

export default async function HelpPage() {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("user_id", user.id)
    .single();

  const preferredLanguage =
    (profile as Profile | null)?.preferred_language ?? "en";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-6 py-4 border-b bg-white">
        <h1 className="text-lg font-bold">Tax Help</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ask any US tax question — no document required. Answers are in your preferred language.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatInterface preferredLanguage={preferredLanguage} />
      </div>
    </div>
  );
}
