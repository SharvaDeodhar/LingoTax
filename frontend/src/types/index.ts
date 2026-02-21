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

// ─── Questionnaire ────────────────────────────────────────────────────────────

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

export interface Questionnaire {
  id: string;
  user_id: string;
  filing_year: number;
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
  created_at: string;
  updated_at: string;
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
