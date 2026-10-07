export type ContactStatus = "ready" | "needs_opt_in" | "do_not_contact" | "invalid" | "missing";
export interface Contact {
  id: number; first_name: string; last_name: string; name: string; company: string; phone: string; country: string;
  email: string; city: string; industry: string; source: string; opted_in: boolean; consent_source: string;
  consent_at: string | null; status: ContactStatus; reason: string; import_batch_id: number | null;
  last_activity: string; last_activity_at: string | null; created_at: string;
}
export interface Template { id: number; name: string; category: "marketing" | "utility"; language: string; body: string; fallbacks: Record<string, string>; fields: string[]; updated_at: string }
export interface Reason { reason: string; count: number }
export interface Report {
  total: number; processed: number; remaining: number; queued: number; processing: number; sent: number; delivered: number;
  failed: number; skipped: number; opted_out: number; retried: number; progress: number;
  failed_reasons: Reason[]; skipped_reasons: Reason[];
}
export interface Campaign {
  id: number; name: string; template_id: number | null; template_name: string; template_body: string;
  audience: { batch_id?: number; country?: string }; status: "draft" | "running" | "paused" | "completed";
  provider: string; created_at: string; started_at: string | null; completed_at: string | null; report: Report;
}
export interface Message {
  id: number; contact_name: string; company: string; phone: string; body: string; status: string; reason: string;
  error_code: string; provider_message_id: string; retry_count: number; opted_out: boolean; updated_at: string;
}
export interface ActivityItem { id: number; type: string; level: "info" | "success" | "warning" | "error"; message: string; details: Record<string, unknown>; created_at: string }
export interface ImportRecord {
  row: number; first_name: string; last_name: string; company: string; phone_raw: string; phone: string | null; country: string;
  email: string; city: string; industry: string; status: string; reason: string; opted_in: boolean; website?: string;
}
export interface ImportSummary {
  total: number; ready: number; needs_opt_in: number; duplicate: number; existing: number; invalid: number; missing: number;
  do_not_contact: number; will_import: number; has_opt_in_column: boolean; imported?: number; error?: string;
}
export interface ImportPreview {
  id: number; file_name: string; status: string; headers: string[]; mapping: Record<string, string | null>; default_country: string;
  fields: { key: string; label: string }[]; sample: Record<string, unknown>[]; summary: ImportSummary; records: ImportRecord[];
}
export interface ListInfo { id: number; name: string; source: string; contacts: number; imported_at: string | null }
