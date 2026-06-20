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
  Calendar as CalendarIcon,
  Search,
} from "lucide-react";
import type { FutureEvent, ConfidenceLevel, RelatedSymbol } from "@/types/briefing";
import { CONFIDENCE_LABELS } from "@/types/briefing";

const CATEGORIES = [
  { value: "macro", label: "宏观经济" },
  { value: "policy", label: "政策事件" },
  { value: "earnings", label: "财报披露" },
  { value: "geopolitics", label: "地缘政治" },
  { value: "industry", label: "行业事件" },
  { value: "other", label: "其他" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "待观察",
  confirmed: "已确认",
  completed: "已完成",
  cancelled: "已取消",
};

export default function EventsPage() {
  const [items, setItems] = useState<FutureEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FutureEvent>>({});
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setItems(json.items);
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleSave() {
    const url = editingId ? `/api/events/${editingId}` : "/api/events";
    const method = editingId ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: "ok", msg: "已保存" });
        setEditingId(null);
        setCreating(false);
        setEditForm({});
        await load();
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`确定删除「${title}」？`)) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
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
      const res = await fetch("/api/events/excel", { method: "POST", body: formData });
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

  const filtered = items.filter((e) => {
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!e.title.toLowerCase().includes(s) && !e.description.toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5 pb-4 border-b border-slate-800 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
            未来事件表
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            未来一周可能发生的重要事件，含潜在影响标的、波动预测、置信度。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/events/excel"
            target="_blank"
            rel="noopener"
            className="px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            导出 Excel
          </a>
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
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setEditForm({
                event_date: new Date().toISOString().slice(0, 10),
                title: "",
                description: "",
                category: "macro",
                confidence: "medium",
                status: "pending",
                potential_impact_symbols: [],
                volatility_forecast: "",
                source: "",
                source_url: "",
                detailed_analysis: "",
              });
            }}
            className="px-3 py-1.5 text-sm rounded-md bg-amber-500 text-slate-900 font-medium hover:bg-amber-400 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            新增事件
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题 / 描述…"
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md bg-slate-800/50 border border-slate-700 text-slate-200 placeholder:text-slate-500"
          />
        </div>
        <div className="flex gap-1 bg-slate-800/50 border border-slate-700 rounded-md p-0.5 text-xs">
          {(
            [
              { key: "all", label: "全部" },
              { key: "pending", label: "待观察" },
              { key: "confirmed", label: "已确认" },
              { key: "completed", label: "已完成" },
              { key: "cancelled", label: "已取消" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilterStatus(f.key)}
              className={[
                "px-2.5 py-1 rounded font-mono",
                filterStatus === f.key
                  ? "bg-amber-500/15 text-amber-300"
                  : "text-slate-400 hover:text-slate-200",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-slate-500 font-mono">
          {filtered.length} 条
        </div>
      </div>

      {creating && (
        <div className="mb-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <EventForm value={editForm} onChange={setEditForm} onSubmit={handleSave} onCancel={() => setCreating(false)} />
        </div>
      )}

      {loading ? (
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
                  <th className="text-left px-3 py-2.5 w-28">日期</th>
                  <th className="text-left px-3 py-2.5">标题 / 描述</th>
                  <th className="text-left px-3 py-2.5 w-24">类别</th>
                  <th className="text-left px-3 py-2.5 w-16">置信度</th>
                  <th className="text-left px-3 py-2.5 w-20">状态</th>
                  <th className="text-left px-3 py-2.5 w-32">波动预测</th>
                  <th className="text-right px-3 py-2.5 w-24">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  filtered.map((e, idx) => {
                    const isEditing = editingId === e.id;
                    return (
                      <tr
                        key={e.id}
                        className="border-b border-slate-800/60 last:border-b-0 hover:bg-slate-800/20"
                      >
                        <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] font-mono text-slate-300">
                          {e.event_date}
                        </td>
                        <td className="px-3 py-2.5 max-w-[400px]">
                          <div className="font-medium text-slate-100 leading-snug">
                            {e.title}
                          </div>
                          <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {e.description}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-300">
                          {CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-300">
                          {CONFIDENCE_LABELS[e.confidence]}
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          <span
                            className={[
                              "px-1.5 py-0.5 rounded font-mono",
                              e.status === "pending"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : e.status === "confirmed"
                                ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                                : e.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                : "bg-slate-700/40 text-slate-400 border border-slate-600",
                            ].join(" ")}
                          >
                            {STATUS_LABELS[e.status] ?? e.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] font-mono text-cyan-300">
                          {e.volatility_forecast || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(e.id);
                                setCreating(false);
                                setEditForm(e);
                              }}
                              className="p-1.5 rounded text-slate-400 hover:bg-slate-800"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(e.id, e.title)}
                              className="p-1.5 rounded text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {editingId && !creating && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditingId(null)}>
          <div className="w-full max-w-2xl bg-[#0d1322] border border-slate-700 rounded-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-medium text-slate-100">编辑事件</h3>
              <button type="button" onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <EventForm value={editForm} onChange={setEditForm} onSubmit={handleSave} onCancel={() => setEditingId(null)} />
            </div>
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

function EventForm({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: Partial<FutureEvent>;
  onChange: (v: Partial<FutureEvent>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="日期 *">
          <input
            type="date"
            value={value.event_date ?? ""}
            onChange={(e) => onChange({ ...value, event_date: e.target.value })}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
          />
        </Field>
        <Field label="类别">
          <select
            value={value.category ?? "macro"}
            onChange={(e) => onChange({ ...value, category: e.target.value })}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="置信度">
          <select
            value={value.confidence ?? "medium"}
            onChange={(e) => onChange({ ...value, confidence: e.target.value as ConfidenceLevel })}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </Field>
        <Field label="状态">
          <select
            value={value.status ?? "pending"}
            onChange={(e) => onChange({ ...value, status: e.target.value as FutureEvent["status"] })}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="标题 *" full>
          <input
            value={value.title ?? ""}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
          />
        </Field>
        <Field label="描述 *" full>
          <textarea
            value={value.description ?? ""}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            rows={3}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
          />
        </Field>
        <Field label="波动预测">
          <input
            value={value.volatility_forecast ?? ""}
            onChange={(e) => onChange({ ...value, volatility_forecast: e.target.value })}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
            placeholder="例：±1.5%~±2.3%"
          />
        </Field>
        <Field label="来源">
          <input
            value={value.source ?? ""}
            onChange={(e) => onChange({ ...value, source: e.target.value })}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
          />
        </Field>
        <Field label="来源 URL" full>
          <input
            value={value.source_url ?? ""}
            onChange={(e) => onChange({ ...value, source_url: e.target.value })}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
          />
        </Field>
        <Field label="详细分析（Markdown）" full>
          <textarea
            value={value.detailed_analysis ?? ""}
            onChange={(e) => onChange({ ...value, detailed_analysis: e.target.value })}
            rows={5}
            className="w-full px-2 py-1.5 text-xs font-mono rounded bg-slate-800 border border-slate-700 text-slate-200"
          />
        </Field>
        <Field label="潜在影响标的（JSON）" full>
          <textarea
            value={JSON.stringify(value.potential_impact_symbols ?? [])}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                if (Array.isArray(parsed)) {
                  onChange({ ...value, potential_impact_symbols: parsed as RelatedSymbol[] });
                }
              } catch {
                // ignore parse error
              }
            }}
            rows={3}
            className="w-full px-2 py-1.5 text-xs font-mono rounded bg-slate-800 border border-slate-700 text-slate-200"
            placeholder='[{"type":"stock","name":"上证50","code":"510050","impact":"positive"}]'
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="px-3 py-1.5 text-sm rounded bg-amber-500 text-slate-900 font-medium hover:bg-amber-400 flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          保存
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
