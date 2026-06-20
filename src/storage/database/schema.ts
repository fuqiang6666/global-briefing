// 手动维护的 schema 定义 - 包含完整的 TypeScript 类型与字段命名
// 注意：shared/schema.ts 是 drizzle-kit 自动生成的，本文件作为应用层 TypeScript 类型源
// 字段名遵循 snake_case（数据库列名），导出类型名保持驼峰

import type { InferSelectModel } from "drizzle-orm";

// ====================== 媒体库 ======================
export interface MediaSource {
  id: string;
  name: string;
  url: string;
  type: string; // party/international/industry/financial/other
  region: string; // cn/global
  enabled: boolean;
  remark: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MediaSourceInsert {
  name: string;
  url: string;
  type: string;
  region?: string;
  enabled?: boolean;
  remark?: string | null;
  sort_order?: number;
}

// ====================== 筛选模型参数 ======================
export interface ModelKeyword {
  word: string;
  weight: number;
}

export interface ModelTopic {
  topic: string;
  weight: number;
}

export interface ModelParams {
  id: string;
  version: number;
  is_active: boolean;
  keywords: ModelKeyword[];
  topic_preferences: ModelTopic[];
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

export interface ModelParamsInsert {
  version?: number;
  is_active?: boolean;
  keywords?: ModelKeyword[];
  topic_preferences?: ModelTopic[];
  exclude_words?: string[];
  long_term_count?: number;
  domestic_impact_count?: number;
  weekly_event_count?: number;
  min_auth_level?: number;
  time_window_hours?: number;
  note?: string | null;
  created_by?: string;
}

// ====================== 简报信息 ======================
export type BriefingSection = "long_term" | "domestic_impact" | "weekly_event";
export type Confidence = "high" | "medium" | "low";

export interface RelatedSymbol {
  type: string; // stock/future/option
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
  confidence: Confidence;
  detailed_analysis: string | null;
  related_symbols: RelatedSymbol[];
  volatility_forecast: string | null;
  event_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BriefingInsert {
  briefing_date: string;
  section: BriefingSection;
  sort_order?: number;
  title: string;
  body: string;
  source: string;
  source_url?: string | null;
  confidence: Confidence;
  detailed_analysis?: string | null;
  related_symbols?: RelatedSymbol[];
  volatility_forecast?: string | null;
  event_date?: string | null;
}

// ====================== 未来事件 ======================
export type EventCategory = "macro" | "policy" | "earnings" | "geopolitical" | "other";
export type EventStatus = "pending" | "occurred" | "cancelled";

export interface FutureEvent {
  id: string;
  event_date: string;
  title: string;
  description: string;
  category: EventCategory;
  confidence: Confidence;
  potential_impact_symbols: RelatedSymbol[];
  volatility_forecast: string | null;
  source: string | null;
  source_url: string | null;
  detailed_analysis: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface FutureEventInsert {
  event_date: string;
  title: string;
  description: string;
  category?: EventCategory;
  confidence: Confidence;
  potential_impact_symbols?: RelatedSymbol[];
  volatility_forecast?: string | null;
  source?: string | null;
  source_url?: string | null;
  detailed_analysis?: string | null;
  status?: EventStatus;
}

// ====================== 邮件设置 ======================
export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailSettings {
  id: string;
  enabled: boolean;
  recipients: EmailRecipient[];
  cc_recipients: EmailRecipient[];
  subject_prefix: string;
  send_hour: number;
  send_minute: number;
  include_media_library_link: boolean;
  include_model_link: boolean;
  last_sent_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSettingsInsert {
  enabled?: boolean;
  recipients?: EmailRecipient[];
  cc_recipients?: EmailRecipient[];
  subject_prefix?: string;
  send_hour?: number;
  send_minute?: number;
  include_media_library_link?: boolean;
  include_model_link?: boolean;
  note?: string | null;
}

export type EmailSendStatus = "success" | "failed" | "partial";

export interface EmailSendLog {
  id: string;
  send_date: string;
  recipients: EmailRecipient[];
  subject: string;
  status: EmailSendStatus;
  error_message: string | null;
  briefing_date: string | null;
  item_count: number;
  created_at: string;
}
