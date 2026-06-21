"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  Save,
  Plus,
  X,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Inbox,
  Link2,
  Settings2,
  PlugZap,
} from "lucide-react";
import type { EmailSettings, EmailSendLog } from "@/types/briefing";
import { isEmailConfigured } from "@/lib/email-client";

async function safeJson<T = unknown>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (!ct.includes("application/json")) {
    throw new Error(`接口返回非 JSON（HTTP ${res.status}）：${text.slice(0, 120)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`JSON 解析失败：${text.slice(0, 120)}`);
  }
}

export default function EmailPage() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [logs, setLogs] = useState<EmailSendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [draft, setDraft] = useState<Partial<EmailSettings>>({});
  const [newRecipient, setNewRecipient] = useState("");
  const [newCc, setNewCc] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [hasSmtpPass, setHasSmtpPass] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l, c] = await Promise.all([
        fetch("/api/email/settings").then(safeJson<{ success: boolean; item?: EmailSettings }>),
        fetch("/api/email/logs?limit=10").then(safeJson<{ success: boolean; items: EmailSendLog[] }>),
        fetch("/api/email/status").then(safeJson<{ success: boolean; configured: boolean }>),
      ]);
      if (s.success && s.item) {
        setSettings(s.item);
        const { smtp_pass: _ignored, ...rest } = s.item as EmailSettings & { smtp_pass?: string };
        setDraft({ ...rest, smtp_pass: "" });
        setHasSmtpPass(Boolean(s.item.smtp_pass));
      }
      if (l.success) setLogs(l.items);
      if (c.success) setEmailConfigured(c.configured);
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
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...draft };
      if (!payload.smtp_pass || (payload.smtp_pass as string).trim() === "") {
        delete payload.smtp_pass;
      }
      const res = await fetch("/api/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await safeJson<{ success: boolean; item?: EmailSettings; error?: string }>(res);
      if (json.success) {
        setSettings(json.item ?? null);
        const { smtp_pass: _ignored, ...rest } = (json.item ?? {}) as EmailSettings & { smtp_pass?: string };
        setDraft({ ...rest, smtp_pass: "" });
        setHasSmtpPass(Boolean(json.item?.smtp_pass));
        setToast({ type: "ok", msg: "已保存" });
      } else {
        setToast({ type: "err", msg: json.error ?? "保存失败" });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSmtp() {
    setTesting(true);
    try {
      const res = await fetch("/api/email/test", { method: "POST" });
      const json = await safeJson<{ success: boolean; ok?: boolean; message?: string; error?: string }>(res);
      if (json.success && json.ok) {
        setToast({ type: "ok", msg: json.message ?? "SMTP 连接成功" });
      } else {
        setToast({ type: "err", msg: json.message ?? json.error ?? "连接失败" });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  }

  async function handleSendNow() {
    setSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: false }),
      });
      const json = await safeJson<{ success: boolean; error?: string; log?: EmailSendLog }>(res);
      if (json.success) {
        setToast({ type: "ok", msg: "已发送（详见日志）" });
        load();
      } else {
        setToast({ type: "err", msg: json.error ?? "发送失败" });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setSending(false);
    }
  }

  function addRecipient() {
    const v = newRecipient.trim();
    if (!v) return;
    setDraft((d) => ({ ...d, recipients: [...(d.recipients ?? []), v] }));
    setNewRecipient("");
  }

  function removeRecipient(i: number) {
    setDraft((d) => ({ ...d, recipients: (d.recipients ?? []).filter((_, idx) => idx !== i) }));
  }

  function addCc() {
    const v = newCc.trim();
    if (!v) return;
    setDraft((d) => ({ ...d, cc_recipients: [...(d.cc_recipients ?? []), v] }));
    setNewCc("");
  }

  function removeCc(i: number) {
    setDraft((d) => ({ ...d, cc_recipients: (d.cc_recipients ?? []).filter((_, idx) => idx !== i) }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={[
            "fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-sm border shadow-lg",
            toast.type === "ok"
              ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/40"
              : "bg-rose-500/15 text-rose-200 border-rose-500/40",
          ].join(" ")}
        >
          {toast.msg}
        </div>
      )}

      <SmtpCard
        draft={draft}
        setDraft={setDraft}
        hasSmtpPass={hasSmtpPass}
        testing={testing}
        saving={saving}
        emailConfigured={emailConfigured}
        onTest={handleTestSmtp}
        onSave={handleSave}
      />

      <div className="bg-[#111726] border border-[#1E2638] rounded-md p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-100">收件与发送</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">收件人（多个）</label>
            <div className="flex gap-2 mb-2">
              <input
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRecipient())}
                placeholder="someone@example.com"
                className="flex-1 px-2 py-1.5 bg-[#0A0E1A] border border-[#1E2638] rounded-md text-sm text-slate-100 focus:outline-none focus:border-amber-500/60"
              />
              <button
                type="button"
                onClick={addRecipient}
                className="px-2.5 py-1.5 border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 rounded-md text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(draft.recipients ?? []).map((r, i) => (
                <span key={`r-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800/60 border border-slate-700 rounded text-xs text-slate-200">
                  {r}
                  <button onClick={() => removeRecipient(i)} className="text-slate-500 hover:text-rose-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">抄送（可选）</label>
            <div className="flex gap-2 mb-2">
              <input
                value={newCc}
                onChange={(e) => setNewCc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCc())}
                placeholder="cc@example.com"
                className="flex-1 px-2 py-1.5 bg-[#0A0E1A] border border-[#1E2638] rounded-md text-sm text-slate-100 focus:outline-none focus:border-amber-500/60"
              />
              <button
                type="button"
                onClick={addCc}
                className="px-2.5 py-1.5 border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 rounded-md text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(draft.cc_recipients ?? []).map((r, i) => (
                <span key={`cc-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800/60 border border-slate-700 rounded text-xs text-slate-200">
                  {r}
                  <button onClick={() => removeCc(i)} className="text-slate-500 hover:text-rose-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">主题前缀</label>
            <input
              value={draft.subject_prefix ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, subject_prefix: e.target.value }))}
              placeholder="每日全球要闻简报"
              className="w-full px-2 py-1.5 bg-[#0A0E1A] border border-[#1E2638] rounded-md text-sm text-slate-100 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">发送时间（北京时区）</label>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="number"
                min={0}
                max={23}
                value={draft.send_hour ?? 8}
                onChange={(e) => setDraft((d) => ({ ...d, send_hour: Number(e.target.value) }))}
                className="w-16 px-2 py-1.5 bg-[#0A0E1A] border border-[#1E2638] rounded-md text-sm text-slate-100 focus:outline-none focus:border-amber-500/60"
              />
              <span className="text-slate-500">:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={draft.send_minute ?? 1}
                onChange={(e) => setDraft((d) => ({ ...d, send_minute: Number(e.target.value) }))}
                className="w-16 px-2 py-1.5 bg-[#0A0E1A] border border-[#1E2638] rounded-md text-sm text-slate-100 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={Boolean(draft.enabled)}
              onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
              className="w-4 h-4 accent-amber-500"
            />
            <label htmlFor="enabled" className="text-sm text-slate-200">启用每日邮件推送</label>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-300">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={Boolean(draft.include_media_library_link)}
                onChange={(e) => setDraft((d) => ({ ...d, include_media_library_link: e.target.checked }))}
                className="w-3.5 h-3.5 accent-amber-500"
              />
              邮件附「媒体库」链接
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={Boolean(draft.include_model_link)}
                onChange={(e) => setDraft((d) => ({ ...d, include_model_link: e.target.checked }))}
                className="w-3.5 h-3.5 accent-amber-500"
              />
              邮件附「模型逻辑」链接
            </label>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#1E2638] flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {settings?.last_sent_at
              ? `上次发送：${new Date(settings.last_sent_at).toLocaleString("zh-CN")}`
              : "尚未发送过"}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-900 text-sm font-medium rounded-md"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              保存
            </button>
            <button
              onClick={handleSendNow}
              disabled={sending || (draft.recipients ?? []).length === 0}
              title={(draft.recipients ?? []).length === 0 ? "请先添加收件人" : "立即发送今日简报"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed text-sm rounded-md"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              立即发送今日
            </button>
          </div>
        </div>
      </div>

      <SendLogsCard logs={logs} />
    </div>
  );
}

interface SmtpCardProps {
  draft: Partial<EmailSettings>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<EmailSettings>>>;
  hasSmtpPass: boolean;
  testing: boolean;
  saving: boolean;
  emailConfigured: boolean;
  onTest: () => void;
  onSave: () => void;
}

function SmtpCard({ draft, setDraft, hasSmtpPass, testing, saving, emailConfigured, onTest, onSave }: SmtpCardProps) {
  return (
    <div className="bg-[#111726] border border-[#1E2638] rounded-md p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-100">SMTP 邮件服务</h2>
          <span
            className={[
              "ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-sm",
              emailConfigured
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "bg-slate-700/40 text-slate-400 border border-slate-600/40",
            ].join(" ")}
          >
            {emailConfigured ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {emailConfigured ? "已配置" : "未配置"}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">SMTP 主机</label>
          <input
            value={draft.smtp_host ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, smtp_host: e.target.value }))}
            placeholder="smtp.qq.com"
            className="w-full px-2 py-1.5 bg-[#0A0E1A] border border-[#1E2638] rounded-md text-sm text-slate-100 focus:outline-none focus:border-amber-500/60"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">端口</label>
          <input
            type="number"
            value={draft.smtp_port ?? 465}
            onChange={(e) => setDraft((d) => ({ ...d, smtp_port: Number(e.target.value) }))}
            className="w-full px-2 py-1.5 bg-[#0A0E1A] border border-[#1E2638] rounded-md text-sm text-slate-100 focus:outline-none focus:border-amber-500/60"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">用户名</label>
          <input
            value={draft.smtp_user ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, smtp_user: e.target.value }))}
            placeholder="user@example.com"
            className="w-full px-2 py-1.5 bg-[#0A0E1A] border border-[#1E2638] rounded-md text-sm text-slate-100 focus:outline-none focus:border-amber-500/60"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">密码 / 授权码</label>
          <input
            type="password"
            value={draft.smtp_pass ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, smtp_pass: e.target.value }))}
            placeholder={hasSmtpPass ? "已保存（如需修改请输入新值）" : "请输入授权码"}
            className="w-full px-2 py-1.5 bg-[#0A0E1A] border border-[#1E2638] rounded-md text-sm text-slate-100 focus:outline-none focus:border-amber-500/60"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">发件人邮箱</label>
          <input
            value={draft.smtp_from_email ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, smtp_from_email: e.target.value }))}
            placeholder="noreply@example.com"
            className="w-full px-2 py-1.5 bg-[#0A0E1A] border border-[#1E2638] rounded-md text-sm text-slate-100 focus:outline-none focus:border-amber-500/60"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">发件人显示名</label>
          <input
            value={draft.smtp_from_name ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, smtp_from_name: e.target.value }))}
            placeholder="全球要闻简报"
            className="w-full px-2 py-1.5 bg-[#0A0E1A] border border-[#1E2638] rounded-md text-sm text-slate-100 focus:outline-none focus:border-amber-500/60"
          />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={Boolean(draft.smtp_secure)}
              onChange={(e) => setDraft((d) => ({ ...d, smtp_secure: e.target.checked }))}
              className="w-4 h-4 accent-amber-500"
            />
            启用 SSL/TLS（465 端口建议开启）
          </label>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#1E2638] flex flex-wrap items-center gap-2">
        <button
          onClick={onTest}
          disabled={testing || !draft.smtp_host}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40 text-sm rounded-md"
        >
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlugZap className="w-3.5 h-3.5" />}
          测试连接
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-900 text-sm font-medium rounded-md"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          保存 SMTP
        </button>
        <span className="text-[10px] text-slate-500 ml-auto">
          QQ/163 邮箱需使用<strong className="text-amber-500/80">授权码</strong>，不是登录密码
        </span>
      </div>
    </div>
  );
}

function SendLogsCard({ logs }: { logs: EmailSendLog[] }) {
  return (
    <div className="bg-[#111726] border border-[#1E2638] rounded-md p-5">
      <div className="flex items-center gap-2 mb-3">
        <Inbox className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-100">最近发送日志</h2>
        <Link2 className="w-3 h-3 text-slate-500 ml-auto" />
      </div>
      {logs.length === 0 ? (
        <div className="text-xs text-slate-500 py-6 text-center">暂无发送记录</div>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left py-1.5 px-2 font-normal">发送时间</th>
              <th className="text-left py-1.5 px-2 font-normal">收件人</th>
              <th className="text-left py-1.5 px-2 font-normal">主题</th>
              <th className="text-left py-1.5 px-2 font-normal">状态</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-[#1E2638]">
                <td className="py-1.5 px-2 text-slate-300 font-mono">
                  {new Date(log.created_at).toLocaleString("zh-CN")}
                </td>
                <td className="py-1.5 px-2 text-slate-300 truncate max-w-[180px]">
                  {(log.recipients ?? []).join(", ")}
                </td>
                <td className="py-1.5 px-2 text-slate-400 truncate max-w-[240px]">{log.subject}</td>
                <td className="py-1.5 px-2">
                  {log.status === "success" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-300">
                      <CheckCircle2 className="w-3 h-3" /> 成功
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-300" title={log.error_message ?? ""}>
                      <AlertCircle className="w-3 h-3" /> 失败
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
