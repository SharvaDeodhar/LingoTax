import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { QuestionnaireForm } from "@/components/profile/QuestionnaireForm";
import type { Questionnaire } from "@/types";
import { CURRENT_FILING_YEAR } from "@/lib/constants";

export default async function ProfilePage() {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Load existing questionnaire if present
  const { data: questionnaire } = await supabase
    .from("questionnaires")
    .select("*")
    .eq("user_id", user.id)
    .eq("filing_year", CURRENT_FILING_YEAR)
    .maybeSingle();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tax Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us about your tax situation for {CURRENT_FILING_YEAR}. This helps us
          recommend the right forms and tasks.
        </p>
      </div>
      <QuestionnaireForm
        userId={user.id}
        initialData={questionnaire as Partial<Questionnaire> ?? undefined}
      />
    </div>
  );
}
