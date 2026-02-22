import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GeneralChatInterface } from "@/components/chat/GeneralChatInterface";
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

  const preferredLanguage = (profile as Profile | null)?.preferred_language ?? "en";

  return (
    <div className="h-[calc(100vh-4rem)]">
      <GeneralChatInterface preferredLanguage={preferredLanguage} />
    </div>
  );
}

