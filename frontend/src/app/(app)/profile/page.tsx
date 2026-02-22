import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { QuestionnaireForm } from "@/components/profile/QuestionnaireForm";
import type {
  Questionnaire,
  QuestionnaireDependent,
  ImmigrationHistoryRow,
  StateResidencyRow,
  D5IncomeDetail,
} from "@/types";
import { CURRENT_FILING_YEAR } from "@/lib/constants";

export default async function ProfilePage() {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: questionnaire } = await supabase
    .from("questionnaires")
    .select("*")
    .eq("user_id", user.id)
    .eq("filing_year", CURRENT_FILING_YEAR)
    .maybeSingle();

  // Load subsidiary table data if a questionnaire exists
  let dependents: QuestionnaireDependent[] = [];
  let immigrationHistory: ImmigrationHistoryRow[] = [];
  let stateResidency: StateResidencyRow[] = [];
  let d5Income: D5IncomeDetail[] = [];

  if (questionnaire?.id) {
    const [depsRes, immigRes, stateRes, d5Res] = await Promise.all([
      supabase
        .from("questionnaire_dependents")
        .select("*")
        .eq("questionnaire_id", questionnaire.id)
        .order("sort_order"),
      supabase
        .from("questionnaire_immigration_history")
        .select("*")
        .eq("questionnaire_id", questionnaire.id)
        .order("sort_order"),
      supabase
        .from("questionnaire_state_residency")
        .select("*")
        .eq("questionnaire_id", questionnaire.id)
        .order("sort_order"),
      supabase
        .from("questionnaire_d5_income")
        .select("*")
        .eq("questionnaire_id", questionnaire.id),
    ]);
    dependents        = (depsRes.data  ?? []) as QuestionnaireDependent[];
    immigrationHistory= (immigRes.data ?? []) as ImmigrationHistoryRow[];
    stateResidency    = (stateRes.data ?? []) as StateResidencyRow[];
    d5Income          = (d5Res.data    ?? []) as D5IncomeDetail[];
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tax Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us about your tax situation for {CURRENT_FILING_YEAR}. This helps
          us recommend the right forms and tasks.
        </p>
      </div>
      <QuestionnaireForm
        userId={user.id}
        initialData={(questionnaire as Partial<Questionnaire>) ?? undefined}
        initialDependents={dependents}
        initialImmigrationHistory={immigrationHistory}
        initialStateResidency={stateResidency}
        initialD5Income={d5Income}
      />
    </div>
  );
}
