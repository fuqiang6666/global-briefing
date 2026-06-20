// Centralized types for the Global Important Information Briefing app

export type ConfidenceLevel = "high" | "medium" | "low";

export type BriefingSection = "long_term" | "domestic_impact" | "weekly_event";

export const SECTION_LABELS: Record<BriefingSection, string> = {
  long_term: "远期发展",
  domestic_impact: "国内市场直接影响",
  weekly_event: "未来一周重点事件",
};

export const SECTION_COUNT: Record<BriefingSection, number> = {
  long_term: 2,
  domestic_impact: 3,
  weekly_event: 5,
};

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  high: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export interface MediaSource {
  id: string;
  name: string;
  url: string;
  type: string; // party / international / financial / industry
  region: string; // cn / global
  enabled: boolean;
  remark: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ModelParam {
  id: string;
  version: number;
  is_active: boolean;
  keywords: KeywordItem[];
  topic_preferences: TopicItem[];
  exclude_words: string[];
  long_term_count: number;
  domestic_impact_count: number;
  weekly_event_count: number;
  min_auth_level: number;
  time_window_hours: number;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface KeywordItem {
  word: string;
  weight: number;
}

export interface TopicItem {
  topic: string;
  weight: number;
}

export interface RelatedSymbol {
  type: "stock" | "future" | "option";
  name: string;
  code: string;
  impact: "positive" | "negative" | "neutral";
}

export interface Briefing {
  id: string;
  briefing_date: string; // YYYY-MM-DD
  section: BriefingSection;
  sort_order: number;
  title: string;
  body: string;
  source: string;
  source_url: string | null;
  confidence: ConfidenceLevel;
  detailed_analysis: string | null;
  related_symbols: RelatedSymbol[];
  volatility_forecast: string | null;
  event_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface FutureEvent {
  id: string;
  event_date: string;
  title: string;
  description: string;
  category: string;
  confidence: ConfidenceLevel;
  potential_impact_symbols: RelatedSymbol[];
  volatility_forecast: string | null;
  source: string | null;
  source_url: string | null;
  detailed_analysis: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface EmailSettings {
  id: string;
  enabled: boolean;
  recipients: string[];
  cc_recipients: string[];
  subject_prefix: string;
  send_hour: number;
  send_minute: number;
  include_media_library_link: boolean;
  include_model_link: boolean;
  last_sent_at: string | null;
  note: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_pass: string | null;
  smtp_secure: boolean | null;
  smtp_from_name: string | null;
  smtp_from_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSendLog {
  id: string;
  send_date: string;
  recipients: string[];
  subject: string;
  status: "success" | "failed" | "skipped";
  error_message: string | null;
  briefing_date: string | null;
  item_count: number;
  created_at: string;
}
