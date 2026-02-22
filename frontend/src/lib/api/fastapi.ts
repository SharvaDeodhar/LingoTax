/**
 * Typed fetch wrappers for FastAPI backend endpoints.
 * Attaches the Supabase JWT to every request via Authorization header.
 * All calls throw on non-OK responses.
 */

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  ChatApiResponse,
  Document,
  TaskRecommendationsResponse,
} from "@/types";

const FASTAPI_URL =
  process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000";

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Not authenticated");

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function createDocument(payload: {
  filename: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  filing_year: number;
  task_id?: string;
}): Promise<Document> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FASTAPI_URL}/documents/create`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function ingestDocument(
  documentId: string
): Promise<{ status: string; document_id: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FASTAPI_URL}/documents/${documentId}/ingest`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listDocuments(filingYear = 2024): Promise<Document[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${FASTAPI_URL}/documents?filing_year=${filingYear}`,
    { headers }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDocumentSignedUrl(
  documentId: string
): Promise<{ signed_url: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${FASTAPI_URL}/documents/${documentId}/signed-url`,
    { headers }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function sendChatMessage(payload: {
  document_id?: string;   // omit for general tax help chat (no document required)
  chat_id?: string;
  question: string;
  language: string;
}): Promise<ChatApiResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FASTAPI_URL}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function getTaskRecommendations(
  filingYear = 2024
): Promise<TaskRecommendationsResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${FASTAPI_URL}/tasks/recommendations?filing_year=${filingYear}`,
    { headers }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateTasks(
  filingYear = 2024
): Promise<{ created: number; skipped: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${FASTAPI_URL}/tasks/generate?filing_year=${filingYear}`,
    { method: "POST", headers }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
