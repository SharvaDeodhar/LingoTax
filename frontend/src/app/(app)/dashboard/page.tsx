import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TaskList } from "@/components/dashboard/TaskList";
import { FormsChecklist } from "@/components/dashboard/FormsChecklist";
import { CURRENT_FILING_YEAR } from "@/lib/constants";
import type { UserFormChecklist } from "@/types";

export default async function DashboardPage() {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch user's form checklist
  const { data: checklist } = await supabase
    .from("user_form_checklist")
    .select("*, forms_catalog(*)")
    .eq("user_id", user.id)
    .eq("filing_year", CURRENT_FILING_YEAR)
    .order("created_at");

  // Check if questionnaire exists
  const { data: questionnaire } = await supabase
    .from("questionnaires")
    .select("id")
    .eq("user_id", user.id)
    .eq("filing_year", CURRENT_FILING_YEAR)
    .maybeSingle();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h1 className="text-xl font-bold">Tax Season {CURRENT_FILING_YEAR}</h1>
        {!questionnaire && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <span className="text-amber-700">
              Complete your{" "}
              <Link href="/profile" className="font-medium underline">
                tax profile
              </Link>{" "}
              to get personalized form recommendations and tasks.
            </span>
          </div>
        )}
      </div>

      {/* 3-column grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0 overflow-hidden">
        {/* Left + Center: Task board */}
        <div className="overflow-y-auto p-6 border-r">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Your Tax Season Tasks
            </h2>
            <Link
              href="/profile"
              className="text-xs text-blue-600 hover:underline"
            >
              Edit profile
            </Link>
          </div>
          <TaskList />
        </div>

        {/* Right: Upcoming forms checklist */}
        <div className="overflow-y-auto p-6 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Upcoming Forms
          </h2>
          <FormsChecklist
            checklist={(checklist as UserFormChecklist[]) ?? []}
            onUpdated={() => {}}
          />
          {checklist && checklist.length === 0 && questionnaire && (
            <p className="text-xs text-muted-foreground mt-4">
              No forms in checklist yet.{" "}
              <Link href="/profile" className="text-blue-600 hover:underline">
                Update your profile
              </Link>{" "}
              to populate recommendations.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
