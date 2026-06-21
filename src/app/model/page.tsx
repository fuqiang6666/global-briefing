"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Loader2,
  Plus,
  Check,
  Trash2,
  Star,
  History,
  Save,
  AlertCircle,
  CheckCircle2,
  BrainCircuit,
  Settings2,
  ListChecks,
  Tag,
  X,
} from "lucide-react";
import type { ModelParam, KeywordItem, TopicItem } from "@/types/briefing";
import AdminGate from "@/components/AdminGate";

export default function ModelPage() {
  const [items, setItems] = useState<ModelParam[]>([]);
  const [active, setActive] = useState<ModelParam | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ModelParam | null>(null);
  const [feedback, setFeedback] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newModel, setNewModel] = useState<Partial<ModelParam>>({});
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, activeRes] = await Promise.all([
        fetch("/api/model", { cache: "no-store" }),
        fetch("/api/model?active=true", { cache: "no-store" }),
      ]);
      const all = await allRes.json();
      const act = await activeRes.json();
      if (all.success) setItems(all.items);
      if (act.success) setActive(act.item);
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

  async function handleActivate(id: string) {
    try {
      const res = await fetch(`/api/model/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: "ok", msg: `已激活 v${json.item.version}` });
        await load();
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  async function handleOptimize(id: string) {
    setOptimizing(true);
    try {
      const res = await fetch(`/api/model/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "optimize", feedback }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({
          type: "ok",
          msg: `已生成 v${json.item.version} 优化建议，可在版本列表中查看`,
        });
        setFeedback("");
        await load();
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setOptimizing(false);
    }
  }

  async function handleDelete(id: string, version: number) {
    if (!confirm(`确定删除 v${version}？`)) return;
    try {
      const res = await fetch(`/api/model/${id}`, { method: "DELETE" });
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

  async function handleSave(m: ModelParam) {
    try {
      const res = await fetch(`/api/model/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(m),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: "ok", msg: "已保存" });
        setEditing(null);
        await load();
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  async function handleCreate() {
    if (!newModel.keywords || !newModel.topic_preferences) {
      setToast({ type: "err", msg: "请至少填写关键词和主题偏好" });
      return;
    }
    try {
      const res = await fetch("/api/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: newModel.keywords,
          topic_preferences: newModel.topic_preferences,
          exclude_words: newModel.exclude_words ?? [],
          long_term_count: newModel.long_term_count ?? 2,
          domestic_impact_count: newModel.domestic_impact_count ?? 3,
          weekly_event_count: newModel.weekly_event_count ?? 5,
          min_auth_level: newModel.min_auth_level ?? 3,
          time_window_hours: newModel.time_window_hours ?? 48,
          note: newModel.note ?? "",
          is_active: false,
          created_by: "manual",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: "ok", msg: `已创建 v${json.item.version}` });
        setCreating(false);
        setNewModel({});
        await load();
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <AdminGate>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5 pb-4 border-b border-slate-800 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-amber-400" />
            模型逻辑
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            调整关键词权重、主题偏好、输出配比。点击「模型逻辑」展开当前生效参数。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="px-3 py-1.5 text-sm rounded-md bg-amber-500 text-slate-900 font-medium hover:bg-amber-400 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          新建版本
        </button>
      </div>

      {/* Active model card */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/[0.02] p-5 mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400/80 flex items-center gap-1.5">
              <Star className="w-3 h-3" />
              当前生效版本
            </div>
            {active ? (
              <h2 className="text-lg font-semibold text-slate-100 mt-1 font-mono">
                v{active.version}
                <span className="ml-2 text-[10px] font-mono text-amber-400/70">
                  · {active.created_by}
                </span>
              </h2>
            ) : (
              <h2 className="text-lg font-semibold text-slate-400 mt-1">未激活</h2>
            )}
          </div>
          {active && (
            <button
              type="button"
              onClick={() => handleOptimize(active.id)}
              disabled={optimizing}
              className="px-3 py-1.5 text-sm rounded-md bg-amber-500 text-slate-900 hover:bg-amber-400 font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              {optimizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {optimizing ? "AI 优化中…" : "AI 一键优化"}
            </button>
          )}
        </div>
        {active ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <Mini label="远期" value={active.long_term_count} />
              <Mini label="国内影响" value={active.domestic_impact_count} />
              <Mini label="一周事件" value={active.weekly_event_count} />
              <Mini label="时间窗" value={`${active.time_window_hours}h`} />
            </div>
            {active.note && (
              <div className="text-xs text-slate-400 italic mb-3">📝 {active.note}</div>
            )}
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 font-mono">关键词：</span>
                {active.keywords.slice(0, 6).map((k) => (
                  <span
                    key={k.word}
                    className="inline-block ml-1 mb-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono"
                  >
                    {k.word}·{k.weight}
                  </span>
                ))}
                {active.keywords.length > 6 && (
                  <span className="text-slate-500 ml-1">+{active.keywords.length - 6}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 font-mono">主题：</span>
                {active.topic_preferences.slice(0, 5).map((t) => (
                  <span
                    key={t.topic}
                    className="inline-block ml-1 mb-1 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono"
                  >
                    {t.topic}·{t.weight}
                  </span>
                ))}
              </div>
              {active.exclude_words.length > 0 && (
                <div>
                  <span className="text-slate-500 font-mono">排除：</span>
                  {active.exclude_words.map((w) => (
                    <span
                      key={w}
                      className="inline-block ml-1 mb-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-[11px] font-mono uppercase tracking-widest text-slate-500 hover:text-slate-300 flex items-center gap-1.5">
                <Settings2 className="w-3 h-3" />
                模型逻辑展开
              </summary>
              <div className="mt-2 p-3 rounded bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap">
{`# 关键词权重 (1-10)
${active.keywords.map((k) => `${k.word}: ${k.weight}`).join("\n")}

# 主题偏好 (1-10)
${active.topic_preferences.map((t) => `${t.topic}: ${t.weight}`).join("\n")}

# 排除词
${active.exclude_words.join(", ")}

# 输出配比
远期发展: ${active.long_term_count} 条
国内直接影响: ${active.domestic_impact_count} 条
未来一周事件: ${active.weekly_event_count} 条

# 采集参数
最小权威等级: ${active.min_auth_level}
时间窗口: ${active.time_window_hours} 小时`}
              </div>
            </details>
            <div className="mt-3 flex gap-2">
              <input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="可选：填写反馈以引导 AI 优化方向"
                className="flex-1 px-3 py-1.5 text-sm rounded-md bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500"
              />
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-500">尚未激活任何模型参数</div>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-slate-100">新建模型版本</h3>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <CreateModelForm
            value={newModel}
            onChange={setNewModel}
            onSubmit={handleCreate}
          />
        </div>
      )}

      {/* Version list */}
      <h2 className="text-base font-semibold text-slate-100 mb-3 flex items-center gap-2">
        <History className="w-4 h-4 text-slate-400" />
        版本历史
      </h2>
      {loading ? (
        <div className="text-center py-8 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          加载中…
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-lg">
          暂无模型版本
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <ModelRow
              key={m.id}
              item={m}
              isEditing={editing?.id === m.id}
              onEdit={() => setEditing(m)}
              onCancelEdit={() => setEditing(null)}
              onSave={handleSave}
              onChange={setEditing}
              onActivate={handleActivate}
              onDelete={handleDelete}
            />
          ))}
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

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/40 px-2.5 py-1.5">
      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div className="text-sm font-mono text-amber-300 font-semibold">{value}</div>
    </div>
  );
}

function ModelRow({
  item,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onChange,
  onActivate,
  onDelete,
}: {
  item: ModelParam;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (m: ModelParam) => void;
  onChange: (m: ModelParam) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string, v: number) => void;
}) {
  if (isEditing) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <Editor
          item={item}
          onChange={onChange}
          onSubmit={() => onSave(item)}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }
  return (
    <div
      className={[
        "rounded-lg border p-4 transition-colors",
        item.is_active
          ? "border-amber-500/30 bg-amber-500/[0.03]"
          : "border-slate-800 bg-[#0d1322] hover:border-slate-700",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-mono font-semibold text-slate-100">
              v{item.version}
            </span>
            {item.is_active && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                <Check className="w-2.5 h-2.5" />
                ACTIVE
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
              {item.created_by}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {new Date(item.created_at).toLocaleString("zh-CN", { hour12: false })}
            </span>
          </div>
          {item.note && (
            <div className="text-xs text-slate-400 italic mb-2">📝 {item.note}</div>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[11px]">
            <Mini label="远期" value={item.long_term_count} />
            <Mini label="国内" value={item.domestic_impact_count} />
            <Mini label="一周" value={item.weekly_event_count} />
            <Mini label="权威" value={item.min_auth_level} />
            <Mini label="时间窗" value={`${item.time_window_hours}h`} />
            <Mini label="关键词" value={item.keywords.length} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {!item.is_active && (
            <button
              type="button"
              onClick={() => onActivate(item.id)}
              className="px-2 py-1 text-[11px] rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-mono flex items-center gap-1"
            >
              <Star className="w-3 h-3" />
              激活
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="px-2 py-1 text-[11px] rounded border border-slate-700 text-slate-300 hover:bg-slate-800 font-mono"
          >
            编辑
          </button>
          {!item.is_active && (
            <button
              type="button"
              onClick={() => onDelete(item.id, item.version)}
              className="px-2 py-1 text-[11px] rounded border border-slate-700 text-rose-300 hover:bg-rose-500/15 font-mono flex items-center gap-1 justify-center"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Editor({
  item,
  onChange,
  onSubmit,
  onCancel,
}: {
  item: ModelParam;
  onChange: (m: ModelParam) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <NumberField
          label="远期"
          value={item.long_term_count}
          onChange={(v) => onChange({ ...item, long_term_count: v })}
        />
        <NumberField
          label="国内"
          value={item.domestic_impact_count}
          onChange={(v) => onChange({ ...item, domestic_impact_count: v })}
        />
        <NumberField
          label="一周"
          value={item.weekly_event_count}
          onChange={(v) => onChange({ ...item, weekly_event_count: v })}
        />
        <NumberField
          label="权威"
          value={item.min_auth_level}
          onChange={(v) => onChange({ ...item, min_auth_level: v })}
        />
        <NumberField
          label="时间窗(h)"
          value={item.time_window_hours}
          onChange={(v) => onChange({ ...item, time_window_hours: v })}
        />
      </div>
      <TagList
        label="关键词 (word · weight)"
        items={item.keywords.map((k) => ({ key: k.word, weight: k.weight }))}
        onChange={(items) =>
          onChange({
            ...item,
            keywords: items.map((i) => ({ word: i.key, weight: i.weight })),
          })
        }
      />
      <TagList
        label="主题偏好 (topic · weight)"
        items={item.topic_preferences.map((k) => ({ key: k.topic, weight: k.weight }))}
        onChange={(items) =>
          onChange({
            ...item,
            topic_preferences: items.map((i) => ({ topic: i.key, weight: i.weight })),
          })
        }
      />
      <StringList
        label="排除词"
        items={item.exclude_words}
        onChange={(ex) => onChange({ ...item, exclude_words: ex })}
      />
      <div>
        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
          备注
        </label>
        <input
          value={item.note ?? ""}
          onChange={(e) => onChange({ ...item, note: e.target.value })}
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
        />
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

function CreateModelForm({
  value,
  onChange,
  onSubmit,
}: {
  value: Partial<ModelParam>;
  onChange: (m: Partial<ModelParam>) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <NumberField
          label="远期"
          value={value.long_term_count ?? 2}
          onChange={(v) => onChange({ ...value, long_term_count: v })}
        />
        <NumberField
          label="国内"
          value={value.domestic_impact_count ?? 3}
          onChange={(v) => onChange({ ...value, domestic_impact_count: v })}
        />
        <NumberField
          label="一周"
          value={value.weekly_event_count ?? 5}
          onChange={(v) => onChange({ ...value, weekly_event_count: v })}
        />
        <NumberField
          label="权威"
          value={value.min_auth_level ?? 3}
          onChange={(v) => onChange({ ...value, min_auth_level: v })}
        />
        <NumberField
          label="时间窗(h)"
          value={value.time_window_hours ?? 48}
          onChange={(v) => onChange({ ...value, time_window_hours: v })}
        />
      </div>
      <TagList
        label="关键词"
        items={(value.keywords ?? []).map((k) => ({ key: k.word, weight: k.weight }))}
        onChange={(items) =>
          onChange({
            ...value,
            keywords: items.map((i) => ({ word: i.key, weight: i.weight })),
          })
        }
      />
      <TagList
        label="主题偏好"
        items={(value.topic_preferences ?? []).map((k) => ({ key: k.topic, weight: k.weight }))}
        onChange={(items) =>
          onChange({
            ...value,
            topic_preferences: items.map((i) => ({ topic: i.key, weight: i.weight })),
          })
        }
      />
      <StringList
        label="排除词"
        items={value.exclude_words ?? []}
        onChange={(ex) => onChange({ ...value, exclude_words: ex })}
      />
      <div>
        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
          备注
        </label>
        <input
          value={value.note ?? ""}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          className="px-3 py-1.5 text-sm rounded bg-amber-500 text-slate-900 font-medium hover:bg-amber-400"
        >
          创建版本
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
      />
    </div>
  );
}

function TagList({
  label,
  items,
  onChange,
}: {
  label: string;
  items: { key: string; weight: number }[];
  onChange: (items: { key: string; weight: number }[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500">
          {label}
        </label>
        <button
          type="button"
          onClick={() => {
            onChange([...items, { key: "", weight: 5 }]);
          }}
          className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          添加
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((it, idx) => {
          return (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={it.key}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...next[idx]!, key: e.target.value };
                  onChange(next);
                }}
                placeholder="名称"
                className="flex-1 px-2 py-1 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
              />
              <input
                type="number"
                value={it.weight}
                min={1}
                max={10}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...next[idx]!, weight: Number(e.target.value) };
                  onChange(next);
                }}
                className="w-16 px-2 py-1 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                className="p-1 rounded text-slate-500 hover:text-rose-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StringList({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500">
          {label}
        </label>
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          添加
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((w, idx) => (
          <div key={idx} className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-1">
            <input
              value={w}
              onChange={(e) => {
                const next = [...items];
                next[idx] = e.target.value;
                onChange(next);
              }}
              className="w-24 px-1 py-0.5 text-xs rounded bg-transparent text-slate-200 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="text-slate-500 hover:text-rose-300"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
