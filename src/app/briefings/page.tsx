"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Upload,
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Search,
  Calendar as CalendarIcon,
  FilterX,
} from "lucide-react";
import type { Briefing, BriefingSection, ConfidenceLevel } from "@/types/briefing";
import { SECTION_LABELS, CONFIDENCE_LABELS } from "@/types/briefing";
import AdminGate from "@/components/AdminGate";

type FilterState = {
  dateFrom: string;
  dateTo: string;
  sections: BriefingSection[];
  confidences: ConfidenceLevel[];
  keyword: string;
};

const EMPTY_FILTER: FilterState = {
  dateFrom: "",
  dateTo: "",
  sections: [],
  confidences: [],
  keyword: "",
};

const SECTION_OPTIONS: BriefingSection[] = [
  "long_term",
  "domestic_impact",
  "weekly_event",
];

const CONFIDENCE_OPTIONS: ConfidenceLevel[] = ["high", "medium", "low"];

function isFilterEmpty(f: FilterState): boolean {
  return (
    !f.dateFrom &&
    !f.dateTo &&
    f.sections.length === 0 &&
    f.confidences.length === 0 &&
    !f.keyword.trim()
  );
}

function filterToParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.dateFrom) p.set("date_from", f.dateFrom);
  if (f.dateTo) p.set("date_to", f.dateTo);
  if (f.sections.length > 0) p.set("sections", f.sections.join(","));
  if (f.confidences.length > 0) p.set("confidences", f.confidences.join(","));
  if (f.keyword.trim()) p.set("q", f.keyword.trim());
  return p;
}

export default function BriefingsPage() {
  const [items, setItems] = useState<Briefing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Briefing>>({});
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState<FilterState>(EMPTY_FILTER);

  const load = useCallback(async (f: FilterState) => {
    setLoading(true);
    try {
      const params = filterToParams(f);
      const url = params.toString()
        ? `/api/briefings?${params.toString()}`
        : "/api/briefings";
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setItems(json.items ?? []);
        setTotal(json.total ?? (json.items?.length ?? 0));
      } else {
        setToast({ type: "err", msg: json.error });
        setItems([]);
        setTotal(0);
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(EMPTY_FILTER);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const activeCount = useMemo(() => {
    let n = 0;
    if (filter.dateFrom) n++;
    if (filter.dateTo) n++;
    if (filter.sections.length > 0) n++;
    if (filter.confidences.length > 0) n++;
    if (filter.keyword.trim()) n++;
    return n;
  }, [filter]);

  function applyFilter() {
    if (filter.dateFrom && filter.dateTo && filter.dateFrom > filter.dateTo) {
      setToast({ type: "err", msg: "开始日期不能晚于结束日期" });
      return;
    }
    setAppliedFilter(filter);
    void load(filter);
  }

  function clearFilter() {
    setFilter(EMPTY_FILTER);
    setAppliedFilter(EMPTY_FILTER);
    void load(EMPTY_FILTER);
  }

  function toggleSection(s: BriefingSection) {
    setFilter((f) => ({
      ...f,
      sections: f.sections.includes(s)
        ? f.sections.filter((x) => x !== s)
        : [...f.sections, s],
    }));
  }

  function toggleConfidence(c: ConfidenceLevel) {
    setFilter((f) => ({
      ...f,
      confidences: f.confidences.includes(c)
        ? f.confidences.filter((x) => x !== c)
        : [...f.confidences, c],
    }));
  }

  async function handleSave(b: Briefing) {
    try {
      const upd = await fetch(`/api/briefings/item/${b.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await upd.json();
      if (json.success) {
        setToast({ type: "ok", msg: "已保存" });
        setEditingId(null);
        await load(appliedFilter);
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  async function handleDelete(b: Briefing) {
    if (!confirm(`确定删除「${b.title}」？`)) return;
    try {
      const res = await fetch(`/api/briefings/item/${b.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setToast({ type: "ok", msg: "已删除" });
        await load(appliedFilter);
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  async function handleImport(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/briefings/excel", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: "ok", msg: `成功导入 ${json.count} 条` });
        await load(appliedFilter);
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setUploading(false);
    }
  }

  function handleExport() {
    const params = filterToParams(appliedFilter);
    const url = params.toString()
      ? `/api/briefings/excel?${params.toString()}`
      : "/api/briefings/excel";
    window.open(url, "_blank");
  }

  const isFiltered = !isFilterEmpty(appliedFilter);

  return (
    <AdminGate>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5 pb-4 border-b border-slate-800 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
            简报信息表
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            多条件筛选历史简报，导出为 Excel 留存 / 二次分析。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={items.length === 0}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {isFiltered ? `导出当前筛选 (${total})` : "导出 Excel"}
          </button>
          <label className="px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer">
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {uploading ? "导入中…" : "导入 Excel"}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-slate-800 bg-[#0d1322]/60 p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
              日期区间
            </span>
          </div>
          <input
            type="date"
            value={filter.dateFrom}
            max={filter.dateTo || undefined}
            onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
            className="px-2 py-1.5 text-sm rounded-md bg-slate-800/50 border border-slate-700 text-slate-200 font-mono"
            placeholder="从"
          />
          <span className="text-slate-600">→</span>
          <input
            type="date"
            value={filter.dateTo}
            min={filter.dateFrom || undefined}
            onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
            className="px-2 py-1.5 text-sm rounded-md bg-slate-800/50 border border-slate-700 text-slate-200 font-mono"
            placeholder="至"
          />

          <div className="flex items-center gap-1.5 ml-3">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="search"
              value={filter.keyword}
              onChange={(e) => setFilter((f) => ({ ...f, keyword: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilter();
              }}
              placeholder="标题 / 正文 / 来源关键词"
              className="px-2 py-1.5 text-sm rounded-md bg-slate-800/50 border border-slate-700 text-slate-200 w-56"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={applyFilter}
              className="px-3 py-1.5 text-sm rounded-md bg-amber-500/90 text-slate-950 font-medium hover:bg-amber-400 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              应用筛选
            </button>
            <button
              type="button"
              onClick={clearFilter}
              disabled={isFilterEmpty(filter) && isFilterEmpty(appliedFilter)}
              className="px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <FilterX className="w-3.5 h-3.5" />
              重置
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
            板块
          </span>
          {SECTION_OPTIONS.map((s) => {
            const active = filter.sections.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSection(s)}
                className={[
                  "px-2.5 py-1 text-xs rounded-sm border font-mono transition-colors",
                  active
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600",
                ].join(" ")}
              >
                {SECTION_LABELS[s]}
              </button>
            );
          })}

          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 ml-3">
            置信度
          </span>
          {CONFIDENCE_OPTIONS.map((c) => {
            const active = filter.confidences.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleConfidence(c)}
                className={[
                  "px-2.5 py-1 text-xs rounded-sm border font-mono transition-colors",
                  active
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600",
                ].join(" ")}
              >
                {CONFIDENCE_LABELS[c]}
              </button>
            );
          })}

          <div className="ml-auto text-xs text-slate-500 font-mono">
            {loading
              ? "加载中…"
              : `${items.length}${total > items.length ? ` / ${total}` : ""} 条${
                  isFiltered ? "（已筛选）" : ""
                }`}
            {activeCount > 0 && (
              <span className="ml-2 text-amber-400">
                {activeCount} 项条件
              </span>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          加载中…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 px-6 py-12 text-center text-slate-500">
          {isFilterEmpty(appliedFilter)
            ? "数据库中暂无简报内容"
            : "当前筛选条件下无匹配记录，请调整筛选条件"}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0d1322] border-b border-slate-800 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2.5 w-24">日期</th>
                  <th className="text-left px-3 py-2.5 w-24">板块</th>
                  <th className="text-left px-3 py-2.5 w-10">序</th>
                  <th className="text-left px-3 py-2.5">标题 / 正文</th>
                  <th className="text-left px-3 py-2.5 w-32">来源</th>
                  <th className="text-left px-3 py-2.5 w-16">置信度</th>
                  <th className="text-left px-3 py-2.5 w-32">波动预测</th>
                  <th className="text-right px-3 py-2.5 w-24">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b, idx) => {
                  const isEditing = editingId === b.id;
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-slate-800/60 last:border-b-0 hover:bg-slate-800/20"
                    >
                      <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">
                        {b.briefing_date}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <select
                            value={editForm.section ?? b.section}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                section: e.target.value as BriefingSection,
                              }))
                            }
                            className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200"
                          >
                            {Object.entries(SECTION_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-300">
                            {SECTION_LABELS[b.section]}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono text-slate-500">
                        {b.sort_order}
                      </td>
                      <td className="px-3 py-2.5 max-w-[400px]">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              value={editForm.title ?? b.title}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, title: e.target.value }))
                              }
                              className="w-full px-2 py-1 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
                            />
                            <textarea
                              value={editForm.body ?? b.body}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, body: e.target.value }))
                              }
                              rows={2}
                              className="w-full px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-100 leading-snug">
                              {b.title}
                            </div>
                            <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                              {b.body}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <input
                            value={editForm.source ?? b.source}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, source: e.target.value }))
                            }
                            className="w-full px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200"
                          />
                        ) : (
                          <span className="text-[11px] text-slate-300">{b.source}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <select
                            value={editForm.confidence ?? b.confidence}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                confidence: e.target.value as ConfidenceLevel,
                              }))
                            }
                            className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200"
                          >
                            <option value="high">高</option>
                            <option value="medium">中</option>
                            <option value="low">低</option>
                          </select>
                        ) : (
                          <span className="text-[11px] text-slate-300">
                            {CONFIDENCE_LABELS[b.confidence]}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-mono text-cyan-300">
                        {isEditing ? (
                          <input
                            value={editForm.volatility_forecast ?? b.volatility_forecast ?? ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                volatility_forecast: e.target.value,
                              }))
                            }
                            className="w-full px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200"
                          />
                        ) : (
                          b.volatility_forecast || "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleSave(b)}
                              className="p-1.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1.5 rounded bg-slate-700/40 text-slate-300 hover:bg-slate-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(b.id);
                                setEditForm(b);
                              }}
                              className="p-1.5 rounded text-slate-400 hover:bg-slate-800"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(b)}
                              className="p-1.5 rounded text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
    </AdminGate>
  );
}
