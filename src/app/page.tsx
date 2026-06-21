"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sparkles,
  Mail,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Globe2,
  LineChart,
  Library,
  BrainCircuit,
  Loader2,
  X,
} from "lucide-react";
import {
  SECTION_LABELS,
  SECTION_COUNT,
  CONFIDENCE_LABELS,
  CONFIDENCE_STYLES,
  VOLATILITY_STYLES,
  parseVolatilityForecast,
  type Briefing,
  type BriefingSection,
  type ConfidenceLevel,
} from "@/types/briefing";

const SECTION_ORDER: BriefingSection[] = [
  "long_term",
  "domestic_impact",
  "weekly_event",
];

const SECTION_ICONS: Record<BriefingSection, React.ReactNode> = {
  long_term: <Globe2 className="w-4 h-4" />,
  domestic_impact: <TrendingUp className="w-4 h-4" />,
  weekly_event: <LineChart className="w-4 h-4" />,
};

const SECTION_DESCRIPTIONS: Record<BriefingSection, string> = {
  long_term: "宏观趋势 · 产业政策 · 科技突破",
  domestic_impact: "对 A股 / 期货 / 期权的直接、即时影响",
  weekly_event: "未来一周可能发生的重要事件",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function HomePageSkeleton() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <div className="animate-pulse">
        <div className="h-12 w-2/3 bg-[var(--panel)] rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-[var(--panel)] rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePageWrapper() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomePage />
    </Suspense>
  );
}

export function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialDate = searchParams.get("date") ?? todayStr();
  const [date, setDate] = useState(initialDate);
  const [items, setItems] = useState<Briefing[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Briefing | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null,
  );

  const load = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/briefings?date=${d}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setItems(json.items);
        setDate(d);
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set("date", d);
        router.replace(`/?${newParams.toString()}`, { scroll: false });
      } else {
        setToast({ type: "err", msg: json.error || "加载失败" });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, [router, searchParams]);

  const loadDates = useCallback(async () => {
    try {
      const res = await fetch("/api/briefings", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setAvailableDates(json.dates ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load(date);
    loadDates();
    // Open the item modal if item id is in URL
    const itemId = searchParams.get("item");
    if (itemId) {
      // Will be set after items load
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const itemId = searchParams.get("item");
    if (itemId && items.length > 0) {
      const found = items.find((i) => i.id === itemId);
      if (found) setSelectedItem(found);
    }
  }, [items, searchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/briefings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, replace: true }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({
          type: "ok",
          msg: `已生成 ${json.count} 条简报（模型 v${json.modelVersion}）`,
        });
        await load(date);
        await loadDates();
      } else {
        setToast({ type: "err", msg: json.error || "生成失败" });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendEmail() {
    setSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: "ok", msg: `邮件已发送至 ${json.log.recipients.join(", ")}` });
      } else {
        setToast({ type: "err", msg: json.error || "发送失败" });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setSending(false);
    }
  }

  const grouped: Record<BriefingSection, Briefing[]> = {
    long_term: [],
    domestic_impact: [],
    weekly_event: [],
  };
  for (const it of items) {
    if (grouped[it.section]) grouped[it.section].push(it);
  }

  const totalCount =
    grouped.long_term.length +
    grouped.domestic_impact.length +
    grouped.weekly_event.length;

  return (
    <div className="terminal-grid min-h-full">
      {/* Header */}
      <div className="border-b border-[#1f2a3d] bg-[#0d1322]/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-amber-400/80">
                <Sparkles className="w-3 h-3" />
                <span>Daily Intelligence Brief</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100 mt-1 tracking-tight">
                每日全球要闻简报
                <span className="ml-2 font-mono text-base sm:text-lg text-slate-400">
                  {date}
                </span>
              </h1>
              <div className="mt-1 text-xs text-slate-500 font-mono">
                共 {totalCount} 条要闻 · 每日 08:01 (BJT) 自动更新
              </div>
            </div>

            {/* Date controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700 rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => load(shiftDate(date, -1))}
                  className="p-1.5 rounded hover:bg-slate-700/60 text-slate-300"
                  aria-label="前一天"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCalendar((s) => !s)}
                    className="px-2.5 py-1.5 text-sm font-mono text-slate-200 flex items-center gap-1.5"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {date}
                    {showCalendar ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {showCalendar && (
                    <div className="absolute right-0 top-full mt-1 z-30 w-64 max-h-72 overflow-y-auto bg-slate-900 border border-slate-700 rounded-md shadow-xl p-2">
                      {availableDates.length === 0 ? (
                        <div className="text-xs text-slate-500 p-3 text-center">
                          暂无历史简报
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-1">
                          {availableDates.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                load(d);
                                setShowCalendar(false);
                              }}
                              className={[
                                "text-[11px] font-mono py-1.5 rounded",
                                d === date
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "text-slate-300 hover:bg-slate-800 border border-transparent",
                              ].join(" ")}
                            >
                              {d.slice(5)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => load(shiftDate(date, 1))}
                  className="p-1.5 rounded hover:bg-slate-700/60 text-slate-300"
                  aria-label="后一天"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleSendEmail}
                disabled={sending || items.length === 0}
                className="px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5"
              >
                {sending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                发送邮件
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Quick links to management pages */}
        <div className="mb-5 flex flex-wrap gap-2 text-xs">
          <Link
            href="/media"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-700 bg-slate-800/30 text-slate-300 hover:border-amber-500/30 hover:text-amber-300"
          >
            <Library className="w-3.5 h-3.5" />
            媒体库管理
          </Link>
          <Link
            href="/model"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-700 bg-slate-800/30 text-slate-300 hover:border-amber-500/30 hover:text-amber-300"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            模型逻辑
          </Link>
        </div>

        {loading ? (
          <Skeleton />
        ) : items.length === 0 ? (
          <EmptyState date={date} onGenerate={handleGenerate} generating={generating} />
        ) : (
          <div className="space-y-8">
            {SECTION_ORDER.map((section) => {
              const list = grouped[section];
              const target = SECTION_COUNT[section];
              return (
                <Section
                  key={section}
                  section={section}
                  list={list}
                  target={target}
                  onOpenDetail={setSelectedItem}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          onClose={() => {
            setSelectedItem(null);
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete("item");
            router.replace(`/?${newParams.toString()}`, { scroll: false });
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={[
            "fixed bottom-6 right-6 z-50 px-4 py-3 rounded-md shadow-lg border text-sm flex items-center gap-2",
            toast.type === "ok"
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/15 text-rose-300 border-rose-500/30",
          ].join(" ")}
        >
          {toast.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Section({
  section,
  list,
  target,
  onOpenDetail,
}: {
  section: BriefingSection;
  list: Briefing[];
  target: number;
  onOpenDetail: (i: Briefing) => void;
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            {SECTION_ICONS[section]}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-100 tracking-tight">
              {SECTION_LABELS[section]}
              <span className="ml-2 text-xs font-mono text-slate-500">
                {list.length}/{target}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">{SECTION_DESCRIPTIONS[section]}</p>
          </div>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
          本板块暂无内容（目标 {target} 条）
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {list.map((item) => (
            <BriefingCard key={item.id} item={item} onOpen={onOpenDetail} />
          ))}
        </div>
      )}
    </section>
  );
}

function BriefingCard({
  item,
  onOpen,
}: {
  item: Briefing;
  onOpen: (i: Briefing) => void;
}) {
  const confidence = (item.confidence || "medium") as ConfidenceLevel;
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0f1623] hover:border-amber-500/30 transition-colors p-4 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1.5">
            <h3 className="text-[15px] font-medium text-slate-100 leading-snug tracking-tight">
              {item.title}
            </h3>
          </div>
          <p className="text-[13px] text-slate-400 leading-relaxed line-clamp-2 mb-3">
            {item.body}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              📰 {item.source}
            </span>
            <span
              className={[
                "inline-flex items-center px-1.5 py-0.5 rounded border font-mono",
                CONFIDENCE_STYLES[confidence],
              ].join(" ")}
            >
              置信度 · {CONFIDENCE_LABELS[confidence]}
            </span>
            {item.volatility_forecast && (() => {
              const v = parseVolatilityForecast(item.volatility_forecast, item.related_symbols);
              if (!v.chip) return null;
              return (
                <span
                  className={[
                    "inline-flex items-center px-1.5 py-0.5 rounded border font-mono",
                    VOLATILITY_STYLES[v.direction],
                  ].join(" ")}
                  title={item.volatility_forecast}
                >
                  {v.chip}
                </span>
              );
            })()}
            {item.event_date && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 font-mono">
                📅 {item.event_date}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="shrink-0 self-start px-2.5 py-1 rounded-md text-[11px] font-mono text-amber-300 border border-amber-500/20 hover:bg-amber-500/10 flex items-center gap-1"
        >
          详细
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function DetailModal({
  item,
  onClose,
}: {
  item: Briefing;
  onClose: () => void;
}) {
  const confidence = (item.confidence || "medium") as ConfidenceLevel;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0d1322] border border-slate-700 rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#0d1322]/95 backdrop-blur border-b border-slate-800 px-5 py-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-amber-400/80 mb-1">
              <Sparkles className="w-3 h-3" />
              {SECTION_LABELS[item.section]}
            </div>
            <h2 className="text-lg font-semibold text-slate-100 tracking-tight">
              {item.title}
            </h2>
            <p className="mt-1 text-sm text-slate-400 leading-relaxed">{item.body}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                📰 {item.source}
              </span>
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 hover:underline font-mono"
                >
                  原文 ↗
                </a>
              )}
              <span
                className={[
                  "px-1.5 py-0.5 rounded border font-mono",
                  CONFIDENCE_STYLES[confidence],
                ].join(" ")}
              >
                置信度 · {CONFIDENCE_LABELS[confidence]}
              </span>
              {item.volatility_forecast && (() => {
                const v = parseVolatilityForecast(item.volatility_forecast, item.related_symbols);
                if (!v.chip) return null;
                return (
                  <span
                    className={[
                      "px-1.5 py-0.5 rounded border font-mono",
                      VOLATILITY_STYLES[v.direction],
                    ].join(" ")}
                    title={item.volatility_forecast}
                  >
                    {v.chip}
                  </span>
                );
              })()}
              {item.event_date && (
                <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 font-mono">
                  📅 {item.event_date}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400"
            aria-label="close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {item.related_symbols && item.related_symbols.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                相关标的
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.related_symbols.map((s, idx) => (
                  <span
                    key={`${s.code}-${idx}`}
                    className={[
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-mono",
                      s.impact === "positive"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : s.impact === "negative"
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        : "bg-slate-800 border-slate-700 text-slate-300",
                    ].join(" ")}
                  >
                    <span className="text-slate-500">
                      {s.type === "stock" ? "📈" : s.type === "future" ? "📊" : "🎯"}
                    </span>
                    {s.name}
                    {s.code && <span className="text-slate-500">·{s.code}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
              详细分析
            </div>
            <div
              className="analysis-content text-sm"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(item.detailed_analysis || "暂无详细分析"),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <div className="h-4 w-32 bg-slate-800/60 rounded mb-3 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[0, 1].map((j) => (
              <div
                key={j}
                className="h-32 bg-slate-800/40 border border-slate-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  date,
  onGenerate,
  generating,
}: {
  date: string;
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <div className="border border-dashed border-slate-700 rounded-2xl px-6 py-12 text-center bg-[#0d1322]/40">
      <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
        <Sparkles className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-100 mb-1">
        {date} 暂未生成简报
      </h3>
      <p className="text-sm text-slate-500 mb-5">
        点击下方按钮，AI 将基于媒体库与模型参数自动生成 10 条结构化要闻。
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="px-4 py-2 rounded-md bg-amber-500 text-slate-900 font-medium hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-1.5"
      >
        {generating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {generating ? "AI 正在生成…" : "立即生成今日简报"}
      </button>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(md: string): string {
  // Minimal markdown renderer for headings, bold, lists, paragraphs
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h2>${escapeHtml(line.slice(3))}</h2>`;
    } else if (line.startsWith("### ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h3>${escapeHtml(line.slice(4))}</h3>`;
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${formatInline(line.replace(/^[-*]\s+/, ""))}</li>`;
    } else if (line.length === 0) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p>${formatInline(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

function formatInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}
