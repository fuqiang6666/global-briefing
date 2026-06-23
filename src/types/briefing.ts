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

export const SECTION_ORDER: BriefingSection[] = ["long_term", "domestic_impact", "weekly_event"];

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

/** 涨/跌 方向；用于波动区间展示。 */
export type VolatilityDirection = "up" | "down" | "neutral";

/** 涨/跌 颜色样式（与设计规范保持一致） */
export const VOLATILITY_STYLES: Record<VolatilityDirection, string> = {
  up: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  down: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  neutral: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
};

/**
 * 把 LLM 输出的波动区间（如 "某板块 +1.5%~+2.3%" / "美元 ±0.5%~±1.0%" / "黄金 -0.3%~-0.7%"）
 * 解析为统一的方向 + 区间字符串。
 *
 * 优先级：
 * 1. 区间两端若同号（++/--），方向由符号决定
 * 2. 区间是 ±（双向）或符号不一致，回退到 related_symbols.impact 投票
 * 3. 都没有则保持 neutral
 */
export function parseVolatilityForecast(
  forecast: string | null | undefined,
  symbols?: RelatedSymbol[],
): { direction: VolatilityDirection; range: string; chip: string } {
  const empty = { direction: "neutral" as VolatilityDirection, range: "", chip: "" };
  if (!forecast) return empty;
  const raw = forecast.trim();
  if (!raw) return empty;

  // 抽取主体（板块/标的等中文片段）和"区间"部分
  // 兼容 "~" / "-" / "–" / "到" / "至" 等分隔符
  const rangeMatch = raw.match(
    /([+\-±]?\s*\d+(?:\.\d+)?\s*%?\s*[~\-–到至]\s*[+\-±]?\s*\d+(?:\.\d+)?\s*%?)/,
  );
  let subject = "";
  let range = raw;
  if (rangeMatch && rangeMatch.index !== undefined) {
    range = rangeMatch[1].replace(/\s+/g, "").replace(/[–到至]/g, "~");
    subject = raw.slice(0, rangeMatch.index).trim();
  }

  // 解析方向
  const parts = range.split("~");
  const left = parts[0] ?? "";
  const right = parts[1] ?? "";
  const lSign = left.trim().startsWith("-") ? "-" : left.trim().startsWith("+") ? "+" : left.trim().startsWith("±") ? "±" : "";
  const rSign = right.trim().startsWith("-") ? "-" : right.trim().startsWith("+") ? "+" : right.trim().startsWith("±") ? "±" : "";

  let direction: VolatilityDirection = "neutral";
  if (lSign && rSign) {
    if (lSign === "+" && rSign === "+") direction = "up";
    else if (lSign === "-" && rSign === "-") direction = "down";
    // "+/~±" 或 "±/-" 等混号：方向由 impact 兜底
  }

  // 用 related_symbols 兜底
  if (direction === "neutral" && symbols && symbols.length > 0) {
    const pos = symbols.filter((s) => s.impact === "positive").length;
    const neg = symbols.filter((s) => s.impact === "negative").length;
    if (pos > neg) direction = "up";
    else if (neg > pos) direction = "down";
  }

  // 区间归一化展示：
  // - up:   "+1.5%~+2.3%" / "±1.5%~±2.3%" -> "1.5%~2.3%"（前缀 "涨" 暗示向上）
  // - down: "-1.5%~-2.3%" / "±1.5%~±2.3%" -> "1.5%~2.3%"（前缀 "跌" 暗示向下；区间取绝对值更易读）
  // - neutral: 保留原始区间（去掉 ± 字符）
  let displayRange = range;
  if (direction === "up" || direction === "down") {
    // 去掉所有 +/-/± 符号，区间数字保留为正值
    displayRange = range.replace(/[+\-±]/g, "");
  } else {
    displayRange = range.replace(/±/g, "");
  }

  const label = direction === "up" ? "涨" : direction === "down" ? "跌" : "波动";
  const prefix = subject ? `${subject} ` : "";
  const chip = `${label} ${prefix}${displayRange}`.trim();
  return { direction, range: displayRange, chip };
}

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
