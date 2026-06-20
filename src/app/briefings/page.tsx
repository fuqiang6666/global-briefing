"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import type { Briefing, BriefingSection, ConfidenceLevel } from "@/types/briefing";
import { SECTION_LABELS, CONFIDENCE_LABELS } from "@/types/briefing";

export default function BriefingsPage() {
  const [items, setItems] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Briefing>>({});
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterDate ? `/api/briefings?date=${filterDate}` : "/api/briefings";
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        if (filterDate) {
          setItems(json.items);
        } else {
          setItems([]);
        }
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleSave(b: Briefing) {
    try {
      const res = await fetch(`/api/briefings/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: b.briefing_date, replace: true }),
      });
      // Use the regular update path via generation
      // For edit, we need an actual update endpoint
      // Fallback: use the api/briefings/excel route
      const _ = res;
      void _;
      // direct update via raw route (we'll add one)
      const upd = await fetch(`/api/briefings/item/${b.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await upd.json();
      if (json.success) {
        setToast({ type: "ok", msg: "已保存" });
        setEditingId(null);
        await load();
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
        await load();
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
        await load();
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
    const url = filterDate
      ? `/api/briefings/excel?date=${filterDate}`
      : "/api/briefings/excel";
    window.open(url, "_blank");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5 pb-4 border-b border-slate-800 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
            简报信息表
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            每日生成的 10 条要闻，支持在线编辑、Excel 导入导出。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            导出 Excel
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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="pl-8 pr-2 py-1.5 text-sm rounded-md bg-slate-800/50 border border-slate-700 text-slate-200 font-mono"
          />
        </div>
        {filterDate && (
          <button
            type="button"
            onClick={() => setFilterDate("")}
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            清除筛选
          </button>
        )}
        <div className="ml-auto text-xs text-slate-500 font-mono">
          {filterDate ? `${items.length} 条记录` : "请选择日期查看"}
        </div>
      </div>

      {!filterDate ? (
        <div className="rounded-lg border border-dashed border-slate-700 px-6 py-12 text-center text-slate-500">
          请选择日期筛选要查看的简报内容
        </div>
      ) : loading ? (
        <div className="text-center py-8 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          加载中…
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0d1322] border-b border-slate-800 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2.5 w-10">#</th>
                  <th className="text-left px-3 py-2.5 w-24">板块</th>
                  <th className="text-left px-3 py-2.5 w-12">序</th>
                  <th className="text-left px-3 py-2.5">标题 / 正文</th>
                  <th className="text-left px-3 py-2.5 w-32">来源</th>
                  <th className="text-left px-3 py-2.5 w-16">置信度</th>
                  <th className="text-left px-3 py-2.5 w-32">波动预测</th>
                  <th className="text-right px-3 py-2.5 w-24">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      该日期暂无简报
                    </td>
                  </tr>
                ) : (
                  items.map((b, idx) => {
                    const isEditing = editingId === b.id;
                    return (
                      <tr
                        key={b.id}
                        className="border-b border-slate-800/60 last:border-b-0 hover:bg-slate-800/20"
                      >
                        <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">
                          {idx + 1}
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
                  })
                )}
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
  );
}
