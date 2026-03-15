// ─── Domain Types ───────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  company_name: string | null;
  default_rate: number;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  client_name: string;
  default_rate: number | null;
}

export interface Session {
  id: string;
  user_id: string;
  client_id: string | null;
  client_name: string;
  transcript: string;
  analysis_json: AnalysisResult | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  session_id: string;
  total_hours: number;
  hourly_rate: number;
  total_amount: number;
  invoice_pdf_url: string | null;
  created_at: string;
}

// ─── AI Pipeline Types ─────────────────────────────────────────

export type EventCategory =
  | "incident_intake"
  | "troubleshooting"
  | "diagnostics"
  | "research"
  | "system_configuration"
  | "software_upgrade"
  | "debugging"
  | "data_backup"
  | "verification"
  | "client_advisory";

export interface ConsultingEvent {
  timestamp: string | null;
  category: EventCategory;
  description: string;
  duration_minutes: number;
}

export interface ServiceCategory {
  category: string;
  events: ConsultingEvent[];
  total_hours: number;
  is_advisory: boolean;
  is_emergency: boolean;
}

export interface BillableSegment {
  service: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  is_emergency: boolean;
}

export interface AnalysisResult {
  event_log: ConsultingEvent[];
  service_categories: ServiceCategory[];
  billable_segments: BillableSegment[];
  deliverables: string[];
  risks_avoided: string[];
  invoice: {
    client_name: string;
    invoice_number: string;
    date: string;
    line_items: BillableSegment[];
    total_hours: number;
    total_amount: number;
    business_impact: string;
  };
  client_summary: string;
  internal_log: string;
}

// ─── API Types ──────────────────────────────────────────────────

export interface AnalyzeRequest {
  transcript: string;
  client_name: string;
  hourly_rate: number;
}

export interface AnalyzeResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
}
