/**
 * Typed fetch wrappers for FastAPI backend endpoints.
 * Attaches the Supabase JWT to every request via Authorization header.
 * All calls throw on non-OK responses.
 */

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ChatApiResponse, Document, TaskRecommendationsResponse } from "@/types";

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
  const res = await fetch(`${FASTAPI_URL}/documents/${documentId}/signed-url`, {
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function sendChatMessage(payload: {
  document_id?: string;
  chat_id?: string;
  question: string;
  language: string;
}): Promise<Response> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FASTAPI_URL}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export async function sendGeneralChatMessage(payload: {
  chat_id?: string;
  question: string;
  language: string;
  images?: { data: string; mime_type: string }[];
}): Promise<Response> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FASTAPI_URL}/chat/general`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export async function summarizeDocument(payload: {
  document_id: string;
  language: string;
}): Promise<Response> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FASTAPI_URL}/chat/summarize`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res;
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

export async function syncTasksFromQuestionnaire(
  filingYear = 2024
): Promise<{ created: number; updated: number; deleted: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FASTAPI_URL}/tasks/sync_from_questionnaire`, {
    method: "POST",
    headers,
    body: JSON.stringify({ filing_year: filingYear }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── PDF Editing Upload (multipart) ───────────────────────────────────────────

export async function saveEditedPdf(
  documentId: string,
  pdfBytes: Uint8Array
): Promise<{ status: string; document_id: string }> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Not authenticated");

  const formData = new FormData();
  const cleanBytes = new Uint8Array(pdfBytes);

  formData.append(
    "file",
    new Blob([cleanBytes], { type: "application/pdf" }),
    "edited.pdf"
  );

  const res = await fetch(`${FASTAPI_URL}/documents/${documentId}/save-pdf`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}