"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Download,
  Upload,
  Loader2,
  Power,
  PowerOff,
  Search,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { MediaSource } from "@/types/briefing";

const TYPE_LABELS: Record<string, string> = {
  party: "党媒央刊",
  financial: "财经媒体",
  international: "国际媒体",
  industry: "行业媒体",
  other: "其他",
};

const TYPE_COLORS: Record<string, string> = {
  party: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  financial: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  international: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  industry: "bg-violet-500/10 text-violet-300 border-violet-500/30",
  other: "bg-slate-700/40 text-slate-300 border-slate-600",
};

const REGION_LABELS: Record<string, string> = {
  cn: "国内",
  global: "国际",
};

export default function MediaPage() {
  const [items, setItems] = useState<MediaSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MediaSource>>({});
  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MediaSource>>({
    name: "",
    url: "",
    type: "international",
    region: "global",
    enabled: true,
    sort_order: 100,
    remark: "",
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/media", { cache: "no-store" });
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

  async function handleCreate() {
    if (!newItem.name || !newItem.url) {
      setToast({ type: "err", msg: "请填写名称和网址" });
      return;
    }
    try {
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: "ok", msg: "已添加" });
        setCreating(false);
        setNewItem({
          name: "",
          url: "",
          type: "international",
          region: "global",
          enabled: true,
          sort_order: 100,
          remark: "",
        });
        await load();
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  async function handleSave(id: string) {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: "ok", msg: "已更新" });
        setEditingId(null);
        await load();
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定删除「${name}」？`)) return;
    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
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

  async function handleToggle(id: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: "ok", msg: enabled ? "已停用" : "已启用" });
        await load();
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  async function handleDownloadTemplate() {
    const res = await fetch("/api/media/excel");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "media_sources_template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExport() {
    const res = await fetch("/api/media/excel");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `media_sources_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/excel", {
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

  const filtered = items.filter((i) => {
    if (filter === "enabled" && !i.enabled) return false;
    if (filter === "disabled" && i.enabled) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !i.name.toLowerCase().includes(s) &&
        !i.url.toLowerCase().includes(s) &&
        !(i.remark ?? "").toLowerCase().includes(s)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <Header
        title="媒体库管理"
        subtitle="配置简报采集与生成使用的全球重要媒体源。党媒央刊为国内必备项。"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              模板
            </button>
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
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="px-3 py-1.5 text-sm rounded-md bg-amber-500 text-slate-900 hover:bg-amber-400 font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              新增媒体
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="媒体总数" value={items.length} />
        <Stat label="已启用" value={items.filter((i) => i.enabled).length} accent="emerald" />
        <Stat label="党媒央刊" value={items.filter((i) => i.type === "party").length} accent="rose" />
        <Stat label="国际媒体" value={items.filter((i) => i.region === "global").length} accent="cyan" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索媒体名 / 网址 / 备注…"
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md bg-slate-800/50 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/40"
          />
        </div>
        <div className="flex gap-1 bg-slate-800/50 border border-slate-700 rounded-md p-0.5 text-xs">
          {(
            [
              { key: "all", label: "全部" },
              { key: "enabled", label: "已启用" },
              { key: "disabled", label: "已停用" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={[
                "px-2.5 py-1 rounded font-mono",
                filter === f.key
                  ? "bg-amber-500/15 text-amber-300"
                  : "text-slate-400 hover:text-slate-200",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-slate-100">新增媒体源</h3>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <FormFields
            value={newItem}
            onChange={setNewItem}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
            submitLabel="添加"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0d1322] border-b border-slate-800 text-[10px] font-mono uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left px-3 py-2.5 w-10">#</th>
                <th className="text-left px-3 py-2.5">名称 / 网址</th>
                <th className="text-left px-3 py-2.5 w-24">类型</th>
                <th className="text-left px-3 py-2.5 w-20">区域</th>
                <th className="text-left px-3 py-2.5 w-20">状态</th>
                <th className="text-left px-3 py-2.5">备注</th>
                <th className="text-right px-3 py-2.5 w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    加载中…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                filtered.map((m, idx) => {
                  const isEditing = editingId === m.id;
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-slate-800/60 last:border-b-0 hover:bg-slate-800/20"
                    >
                      <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              value={editForm.name ?? ""}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, name: e.target.value }))
                              }
                              className="w-full px-2 py-1 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
                            />
                            <input
                              value={editForm.url ?? ""}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, url: e.target.value }))
                              }
                              className="w-full px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-100">{m.name}</div>
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-cyan-400 hover:underline font-mono"
                            >
                              {m.url}
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <select
                            value={editForm.type ?? "international"}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, type: e.target.value }))
                            }
                            className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200"
                          >
                            {Object.entries(TYPE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={[
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border",
                              TYPE_COLORS[m.type] ?? TYPE_COLORS.other,
                            ].join(" ")}
                          >
                            {TYPE_LABELS[m.type] ?? m.type}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <select
                            value={editForm.region ?? "global"}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, region: e.target.value }))
                            }
                            className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200"
                          >
                            <option value="cn">国内</option>
                            <option value="global">国际</option>
                          </select>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {REGION_LABELS[m.region] ?? m.region}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {m.enabled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                            启用
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            停用
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[200px] truncate">
                        {isEditing ? (
                          <input
                            value={editForm.remark ?? ""}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, remark: e.target.value }))
                            }
                            className="w-full px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200"
                          />
                        ) : (
                          m.remark || "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleSave(m.id)}
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
                              onClick={() => handleToggle(m.id, m.enabled)}
                              className="p-1.5 rounded text-slate-400 hover:bg-slate-800"
                              title={m.enabled ? "停用" : "启用"}
                            >
                              {m.enabled ? (
                                <PowerOff className="w-3.5 h-3.5" />
                              ) : (
                                <Power className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(m.id);
                                setEditForm(m);
                              }}
                              className="p-1.5 rounded text-slate-400 hover:bg-slate-800"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(m.id, m.name)}
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

function FormFields({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  value: Partial<MediaSource>;
  onChange: (v: Partial<MediaSource>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="名称 *">
        <input
          value={value.name ?? ""}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
          placeholder="例：人民日报"
        />
      </Field>
      <Field label="网址 *">
        <input
          value={value.url ?? ""}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
          placeholder="https://..."
        />
      </Field>
      <Field label="类型">
        <select
          value={value.type ?? "international"}
          onChange={(e) => onChange({ ...value, type: e.target.value })}
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
        >
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="区域">
        <select
          value={value.region ?? "global"}
          onChange={(e) => onChange({ ...value, region: e.target.value })}
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
        >
          <option value="cn">国内</option>
          <option value="global">国际</option>
        </select>
      </Field>
      <Field label="排序">
        <input
          type="number"
          value={value.sort_order ?? 100}
          onChange={(e) => onChange({ ...value, sort_order: Number(e.target.value) })}
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
        />
      </Field>
      <Field label="启用">
        <label className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={value.enabled ?? true}
            onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
            className="rounded border-slate-600"
          />
          启用此媒体
        </label>
      </Field>
      <Field label="备注" full>
        <input
          value={value.remark ?? ""}
          onChange={(e) => onChange({ ...value, remark: e.target.value })}
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
          placeholder="选填"
        />
      </Field>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="px-3 py-1.5 text-sm rounded-md bg-amber-500 text-slate-900 font-medium hover:bg-amber-400"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function Header({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-slate-800">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "rose" | "cyan";
}) {
  const accentClass = accent
    ? {
        emerald: "text-emerald-400",
        rose: "text-rose-400",
        cyan: "text-cyan-400",
      }[accent]
    : "text-slate-100";
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0d1322] px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div className={`text-2xl font-semibold font-mono mt-1 ${accentClass}`}>{value}</div>
    </div>
  );
}
