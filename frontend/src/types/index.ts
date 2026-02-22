// ─── Auth ─────────────────────────────────────────────────────────────────────

export type AuthProvider = "google" | "email" | "github";

export interface ConnectedIdentity {
  provider: AuthProvider;
  identity_id: string;
  created_at: string;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface Profile {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  preferred_language: string;
  has_password: boolean;
  primary_auth_provider: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Questionnaire shared ─────────────────────────────────────────────────────

/** Standard tri-state answer used throughout the questionnaire */
export type YnsAnswer = "yes" | "no" | "not_sure" | null;

export type FilingStatus =
  | "single"
  | "married_filing_jointly"
  | "married_filing_separately"
  | "head_of_household"
  | "qualifying_widow";

export type ResidencyStatus =
  | "citizen"
  | "permanent_resident"
  | "resident_alien"
  | "nonresident_alien"
  | "dual_status"
  | "unsure";

// ─── Questionnaire main row (maps to questionnaires table) ────────────────────

export interface Questionnaire {
  id: string;
  user_id: string;
  filing_year: number;
  questionnaire_version: number;

  // Legacy / backward-compat fields (kept for tasks.py recommendations engine)
  filing_status: FilingStatus | null;
  residency_status: ResidencyStatus | null;
  visa_type: string | null;
  has_ssn: boolean | null;
  has_itin: boolean | null;
  num_dependents: number;
  states_lived: string[];
  states_worked: string[];
  income_sources: string[];
  notes: string | null;

  // Section A — Basic Identity & Filing Setup
  country_of_residence: string | null;
  multi_state_lived: YnsAnswer;
  age_on_dec31: number | null;
  ssn_status: "yes" | "no" | "applied_waiting" | "prefer_not_to_say" | null;
  itin_status: "yes" | "no" | "applied_waiting" | "not_sure" | null;
  filing_for: "self" | "self_spouse" | "self_dependents" | "self_spouse_dependents" | "not_sure" | null;

  // Section B — Immigration / Residency
  is_us_citizen: "yes" | "no" | null;
  is_permanent_resident: YnsAnswer;
  immigration_statuses: string[];
  immigration_status_other: string | null;
  status_changed: YnsAnswer;
  first_entry_date: string | null;
  us_days_current_type: "exact" | "estimate" | "not_sure" | null;
  us_days_current: number | null;
  us_days_year_minus1: number | null;
  us_days_year_minus2: number | null;
  us_days_prior_not_sure: boolean;
  is_exempt_individual: YnsAnswer;
  received_scholarship: YnsAnswer;
  received_school_tax_forms: YnsAnswer;

  // Section C — Filing Status & Family
  marital_status: "single" | "married" | "separated" | "divorced" | "widowed" | "not_sure" | null;
  spouse_location: "us" | "outside_us" | "part_year" | "not_sure" | null;
  spouse_id_type: "ssn" | "itin" | "no" | "applied_waiting" | "not_sure" | null;
  has_dependents: YnsAnswer;

  // Section D — Employment & Income
  employee_wages: YnsAnswer;
  received_w2: "yes" | "no" | "not_sure" | "lost" | null;
  num_employers: "1" | "2_3" | "4_plus" | "not_sure" | null;
  worked_multi_state: YnsAnswer;
  freelance_income: YnsAnswer;
  received_1099: YnsAnswer;
  has_business_expenses: YnsAnswer;
  used_car_for_work: boolean | null;
  earned_bank_interest: YnsAnswer;
  has_investments: YnsAnswer;
  sold_investments: YnsAnswer;
  received_broker_forms: YnsAnswer;
  was_student: "yes" | "no" | null;
  paid_tuition: YnsAnswer;
  received_1098t: YnsAnswer;
  taxable_scholarship_inc: YnsAnswer;

  // Section E — Foreign Assets / International
  foreign_bank_accounts: YnsAnswer;
  multi_country_accounts: boolean | null;
  foreign_accounts_value: "yes" | "no" | "not_sure" | "dont_know" | null;
  foreign_income: YnsAnswer;
  owns_foreign_company: YnsAnswer;
  received_foreign_family_money: YnsAnswer;
  foreign_family_money_type: "gift" | "income" | "support" | null;
  paid_foreign_taxes: YnsAnswer;
  filing_foreign_taxes: YnsAnswer;

  // Section F — Health Coverage / Life Events
  health_coverage: "all_year" | "part_year" | "no" | "not_sure" | null;
  marketplace_insurance: YnsAnswer;
  received_1095a: YnsAnswer;
  life_events: string[];

  // Section G — Deductions / Credits
  deduct_tuition_fees: YnsAnswer;
  deduct_student_loan_int: YnsAnswer;
  claimed_as_dependent: YnsAnswer;
  paid_childcare: YnsAnswer;
  bought_work_supplies: YnsAnswer;
  paid_biz_comms: YnsAnswer;
  has_home_office: YnsAnswer;
  paid_rent: YnsAnswer;
  paid_mortgage: YnsAnswer;
  made_donations: YnsAnswer;
  paid_state_local_taxes: YnsAnswer;
  contributed_hsa: YnsAnswer;
  withdrew_hsa: YnsAnswer;
  large_medical_expenses: YnsAnswer;
  contributed_ira: YnsAnswer;

  // Section H — Document Inventory
  owned_documents: string[];
  waiting_for_forms: YnsAnswer;
  lost_forms: "yes" | "no" | null;
  can_contact_issuer: YnsAnswer;

  // Section I — Prior Filing History
  filed_us_taxes: YnsAnswer;
  first_filed_year: number | null;
  has_prior_return: YnsAnswer;
  prior_filing_type: "resident" | "nonresident" | "not_sure" | "dont_know" | null;
  received_irs_letter: YnsAnswer;

  created_at: string;
  updated_at: string;
}

// ─── Questionnaire subsidiary tables ─────────────────────────────────────────

export interface QuestionnaireDependent {
  id?: string;
  full_name: string | null;
  relationship: string | null;
  date_of_birth: string | null;
  months_lived_with: number | null;
  id_type: "ssn" | "itin" | "no" | "applied_waiting" | "not_sure" | null;
  is_full_time_student: boolean | null;
  provided_over_half_support: boolean | null;
  residence: "us" | "outside_us" | "both" | null;
}

export interface ImmigrationHistoryRow {
  id?: string;
  from_status: string;
  to_status: string;
  effective_date: string | null;
}

export interface StateResidencyRow {
  id?: string;
  state_code: string;
  date_from: string | null;
  date_to: string | null;
}

export interface D5IncomeDetail {
  income_source: string;
  flag: YnsAnswer;
  approximate_amount: number | null;
  country_source: string | null;
  received_document: YnsAnswer;
  document_name: string | null;
  can_upload: "yes" | "no" | "later" | null;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskStatus = "not_started" | "in_progress" | "done";

export interface TaskGroup {
  id: string;
  name: string;
  sort_order: number;
}

export interface Task {
  id: string;
  user_id: string;
  task_group_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  filing_year: number;
  sort_order: number;
  form_code: string | null;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
  task_groups?: TaskGroup;
}

// ─── Forms ────────────────────────────────────────────────────────────────────

export type FormChecklistStatus = "pending" | "received" | "filed";

export interface FormCatalogItem {
  id: string;
  form_code: string;
  display_name: string;
  description: string | null;
  applicable_sources: string[];
  federal: boolean;
}

export interface UserFormChecklist {
  id: string;
  user_id: string;
  form_id: string;
  filing_year: number;
  status: FormChecklistStatus;
  forms_catalog?: FormCatalogItem;
}

// ─── Documents ────────────────────────────────────────────────────────────────

export type IngestStatus = "pending" | "processing" | "ready" | "error";

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  ingest_status: IngestStatus;
  error_message: string | null;
  filing_year: number;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChunkSource {
  chunk_id: string;
  chunk_text: string;
  page: number | null;
  form_fields: Record<string, string>;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  lang: string | null;
  sources: ChunkSource[];
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  document_id: string | null;
  title: string | null;
  created_at: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ChatApiResponse {
  chat_id: string;
  answer: string;
  sources: ChunkSource[];
}

export interface TaskRecommendationsResponse {
  recommended_forms: FormCatalogItem[];
  tasks: Array<{
    group: string;
    title: string;
    description: string;
  }>;
  questionnaire?: Questionnaire;
  message?: string;
}
