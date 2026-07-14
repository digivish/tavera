export interface Supplier {
  id: string;
  legal_name: string;
  dba: string | null;
  duns: string | null;
  facility_id: string | null;
  health_authority: string | null;
  parent_organization: string | null;
  registered_entity: string | null;
  address: string | null;
  status: SupplierStatus;
  unified_score: number | null;
  score_sources_available: number;
  score_sources_total: number;
  score_last_updated: string | null;
  orgbook_match_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export type SupplierStatus =
  | "imported"
  | "mapped"
  | "active"
  | "flagged"
  | "monitored"
  | "archived";

export interface Infraction {
  id: string;
  source: string;
  infraction_type: string;
  description: string;
  severity: "critical" | "moderate" | "non_critical";
  status: "pending_review" | "resolved" | "active";
  action_taken: string | null;
  reported_date: string;
  created_at: string;
}

export interface SupplierDetail extends Supplier {
  infractions: Infraction[];
}

export type RiskLevel = "low" | "moderate" | "high" | "unknown";

export interface SupplierListResponse {
  suppliers: Supplier[];
  total: number;
  page: number;
  page_size: number;
}

export function scoreToRiskLevel(score: number | null): RiskLevel {
  if (score === null) return "unknown";
  if (score >= 85) return "low";
  if (score >= 65) return "moderate";
  return "high";
}

export function statusLabel(status: SupplierStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function riskLevelColor(level: RiskLevel): string {
  switch (level) {
    case "low":
      return "text-secondary";
    case "moderate":
      return "text-tertiary";
    case "high":
      return "text-error";
    case "unknown":
      return "text-outline";
  }
}

export function scoreBarColor(score: number | null): string {
  if (score === null) return "bg-outline";
  if (score >= 85) return "bg-secondary";
  if (score >= 65) return "bg-tertiary";
  return "bg-error";
}
