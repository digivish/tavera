const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function apiKey(): string {
  return localStorage.getItem("tavera_api_key") || "";
}

export function setApiKey(key: string): void {
  localStorage.setItem("tavera_api_key", key);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey(),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    throw new Error("Invalid or missing API key. Set it via setApiKey().");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { detail?: string }).detail || `HTTP ${res.status}`,
    );
  }

  return res.json();
}

import type {
  SupplierDetail,
  SupplierListResponse,
} from "../types/supplier";

export interface ListParams {
  page?: number;
  page_size?: number;
  status?: string;
  risk_level?: string;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export async function listSuppliers(
  params: ListParams = {},
): Promise<SupplierListResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });
  return request<SupplierListResponse>(
    `/api/v1/suppliers/${qs.size ? `?${qs}` : ""}`,
  );
}

export async function getSupplier(id: string): Promise<SupplierDetail> {
  return request<SupplierDetail>(`/api/v1/suppliers/${id}`);
}

export async function refreshScore(
  id: string,
): Promise<{ unified_score: number | null; risk_level: string }> {
  return request(`/api/v1/suppliers/${id}/score`);
}

export async function getFlagged(): Promise<{
  count: number;
  suppliers: SupplierDetail[];
}> {
  return request("/api/v1/alerts/flagged");
}

export interface RecentInfraction {
  id: string;
  source: string;
  infraction_type: string;
  description: string;
  severity: "critical" | "moderate" | "non_critical";
  status: "pending_review" | "resolved" | "active";
  action_taken: string | null;
  reported_date: string;
  supplier_name: string;
  health_authority: string | null;
}

export async function getRecentInfractions(
  limit = 10,
): Promise<RecentInfraction[]> {
  return request(`/api/v1/alerts/recent?limit=${limit}`);
}

export async function importCsv(file: File): Promise<{
  imported: number;
  failed: number;
  errors: { row: number; error: string }[];
}> {
  const form = new FormData();
  form.set("file", file);

  const res = await fetch(`${BASE_URL}/api/v1/suppliers/import`, {
    method: "POST",
    headers: { "X-API-Key": apiKey() },
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { detail?: string }).detail || `HTTP ${res.status}`,
    );
  }

  return res.json();
}
