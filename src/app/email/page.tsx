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
} from "lucide-react";
import type { EmailSettings, EmailSendLog } from "@/types/briefing";
import { isEmailConfigured } from "@/lib/email-client";

export default function EmailPage() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [logs, setLogs] = useState<EmailSendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState<Partial<EmailSettings>>({});
  const [newRecipient, setNewRecipient] = useState("");
  const [newCc, setNewCc] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l, c] = await Promise.all([
        fetch("/api/email/settings").then((r) => r.json()),
        fetch("/api/email/logs?limit=10").then((r) => r.json()),
        fetch("/api/email/status").then((r) => r.json()),
      ]);
      if (s.success) {
        setSettings(s.item);
        setDraft(s.item ?? {});
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
      const res = await fetch("/api/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (json.success) {
        setSettings(json.item);
        setToast({ type: "ok", msg: "已保存" });
        await load();
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
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
      const json = await res.json();
      if (json.success) {
        setToast({ type: "ok", msg: "已发送" });
        await load();
      } else {
        setToast({ type: "err", msg: json.error });
      }
    } catch (e: unknown) {
      setToast({ type: "err", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setSending(false);
    }
  }

  function addRecipient() {
    if (!newRecipient.includes("@")) {
      setToast({ type: "err", msg: "请输入合法邮箱" });
      return;
    }
    setDraft((d) => ({
      ...d,
      recipients: Array.from(new Set([...(d.recipients ?? []), newRecipient])),
    }));
    setNewRecipient("");
  }
  function addCc() {
    if (!newCc.includes("@")) {
      setToast({ type: "err", msg: "请输入合法邮箱" });
      return;
    }
    setDraft((d) => ({
      ...d,
      cc_recipients: Array.from(new Set([...(d.cc_recipients ?? []), newCc])),
    }));
    setNewCc("");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5 pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-semibold text-slate-100 tracking-tight flex items-center gap-2">
          <Mail className="w-6 h-6 text-amber-400" />
          邮件推送设置
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          配置收件人、发送时间、主题等。每日 {String(draft.send_hour ?? 8).padStart(2, "0")}:
          {String(draft.send_minute ?? 1).padStart(2, "0")} (BJT) 自动发送。
        </p>
      </div>

      {!emailConfigured && (
        <div className="mb-5 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/90">
            <div className="font-medium text-amber-200">SMTP 凭据未配置</div>
            <div className="text-xs mt-1 text-amber-300/70">
              请在下方「SMTP 凭据」中填写主机、端口、账号、授权码后保存；或确认环境变量{" "}
              <code className="font-mono">SMTP_HOST</code> /{" "}
              <code className="font-mono">SMTP_USER</code> /{" "}
              <code className="font-mono">SMTP_PASS</code> 已设置。配置后即可发送邮件。
            </div>
          </div>
        </div>
      )}

      {/* SMTP Credentials */}
      <SmtpCard draft={draft} setDraft={setDraft} configured={emailConfigured} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Recipients */}
          <div className="rounded-lg border border-slate-800 bg-[#0d1322] p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
              <Inbox className="w-3 h-3" />
              收件人
            </div>
            <div className="flex gap-2 mb-2">
              <input
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRecipient()}
                placeholder="example@mail.com"
                className="flex-1 px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
              />
              <button
                type="button"
                onClick={addRecipient}
                className="px-3 py-1.5 text-sm rounded bg-amber-500 text-slate-900 font-medium hover:bg-amber-400 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(draft.recipients ?? []).map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-mono"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        recipients: (d.recipients ?? []).filter((x) => x !== r),
                      }))
                    }
                    className="hover:text-rose-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(draft.recipients ?? []).length === 0 && (
                <span className="text-xs text-slate-500">尚未添加收件人</span>
              )}
            </div>
          </div>

          {/* CC */}
          <div className="rounded-lg border border-slate-800 bg-[#0d1322] p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">
              抄送（可选）
            </div>
            <div className="flex gap-2 mb-2">
              <input
                value={newCc}
                onChange={(e) => setNewCc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCc()}
                placeholder="cc@mail.com"
                className="flex-1 px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
              />
              <button
                type="button"
                onClick={addCc}
                className="px-3 py-1.5 text-sm rounded border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(draft.cc_recipients ?? []).map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        cc_recipients: (d.cc_recipients ?? []).filter((x) => x !== r),
                      }))
                    }
                    className="hover:text-rose-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-lg border border-slate-800 bg-[#0d1322] p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              发送时间（北京时间）
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  小时
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={draft.send_hour ?? 8}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, send_hour: Number(e.target.value) }))
                  }
                  className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  分钟
                </label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={draft.send_minute ?? 1}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, send_minute: Number(e.target.value) }))
                  }
                  className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  主题前缀
                </label>
                <input
                  value={draft.subject_prefix ?? "每日全球要闻简报"}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, subject_prefix: e.target.value }))
                  }
                  className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={draft.enabled ?? false}
                  onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
                  className="rounded border-slate-600"
                />
                启用每日自动发送
              </label>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={draft.include_media_library_link ?? true}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, include_media_library_link: e.target.checked }))
                  }
                  className="rounded border-slate-600"
                />
                包含媒体库入口
              </label>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={draft.include_model_link ?? true}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, include_model_link: e.target.checked }))
                  }
                  className="rounded border-slate-600"
                />
                包含模型逻辑入口
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-md bg-amber-500 text-slate-900 font-medium hover:bg-amber-400 flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              保存设置
            </button>
            <button
              type="button"
              onClick={handleSendNow}
              disabled={sending || !emailConfigured}
              className="px-4 py-2 text-sm rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              立即发送今日简报
            </button>
          </div>
        </div>

        {/* Side: status */}
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-[#0d1322] p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
              <Settings2 className="w-3 h-3" />
              当前状态
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">启用</span>
                <span
                  className={
                    draft.enabled
                      ? "text-emerald-400 font-mono"
                      : "text-slate-500 font-mono"
                  }
                >
                  {draft.enabled ? "ON" : "OFF"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">收件人</span>
                <span className="text-slate-200 font-mono">
                  {(draft.recipients ?? []).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">发送时间</span>
                <span className="text-amber-300 font-mono">
                  {String(draft.send_hour ?? 8).padStart(2, "0")}:
                  {String(draft.send_minute ?? 1).padStart(2, "0")} BJT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SMTP</span>
                <span
                  className={
                    emailConfigured
                      ? "text-emerald-400 font-mono"
                      : "text-rose-400 font-mono"
                  }
                >
                  {emailConfigured ? "READY" : "NOT SET"}
                </span>
              </div>
              {settings?.last_sent_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">上次发送</span>
                  <span className="text-slate-300 font-mono text-[11px]">
                    {new Date(settings.last_sent_at).toLocaleString("zh-CN", {
                      hour12: false,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0d1322] p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
              <Link2 className="w-3 h-3" />
              Cron 调用示例
            </div>
            <pre className="text-[10px] font-mono text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800 overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST \\
  ${process.env.NEXT_PUBLIC_DOMAIN ?? "https://your-domain"}/api/cron/daily \\
  -H "Content-Type: application/json" \\
  -d '{"secret":"<CRON_SECRET>"}'`}
            </pre>
            <div className="mt-2 text-[10px] text-slate-500">
              建议配合外部定时任务平台（如 crontab、GitHub Actions、扣子定时任务）调用，每日 08:01 (BJT) 触发。
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0d1322] p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
              发送记录
            </div>
            {logs.length === 0 ? (
              <div className="text-xs text-slate-500">暂无记录</div>
            ) : (
              <div className="space-y-1.5">
                {logs.map((l) => (
                  <div
                    key={l.id}
                    className="text-[11px] font-mono border-l-2 pl-2 py-1"
                    style={{
                      borderColor:
                        l.status === "success"
                          ? "#34d399"
                          : l.status === "failed"
                          ? "#fb7185"
                          : "#64748b",
                    }}
                  >
                    <div className="text-slate-300 truncate">{l.subject}</div>
                    <div className="text-slate-500 flex justify-between">
                      <span>
                        {l.status === "success"
                          ? "✓ 成功"
                          : l.status === "failed"
                          ? "✗ 失败"
                          : "○ 跳过"}
                      </span>
                      <span>{l.item_count} 条</span>
                    </div>
                    {l.error_message && (
                      <div className="text-rose-400 text-[10px] truncate">
                        {l.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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

function SmtpCard({
  draft,
  setDraft,
  configured,
}: {
  draft: Partial<EmailSettings>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<EmailSettings>>>;
  configured: boolean;
}) {
  const [showPass, setShowPass] = useState(false);
  return (
    <div className="mb-5 rounded-lg border border-slate-800 bg-[#0d1322] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <Settings2 className="w-3 h-3" />
          SMTP 凭据
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase">
          {configured ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              已配置
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              未配置
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
            SMTP 主机 / Host
          </label>
          <input
            value={draft.smtp_host ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, smtp_host: e.target.value }))}
            placeholder="smtp.example.com"
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
            端口 / Port
          </label>
          <input
            type="number"
            value={draft.smtp_port ?? 465}
            onChange={(e) => setDraft((d) => ({ ...d, smtp_port: Number(e.target.value) || 465 }))}
            placeholder="465"
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
            账号 / Username
          </label>
          <input
            value={draft.smtp_user ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, smtp_user: e.target.value }))}
            placeholder="alerts@example.com"
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
            授权码 / Password
          </label>
          <div className="flex gap-1.5">
            <input
              type={showPass ? "text" : "password"}
              value={draft.smtp_pass ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, smtp_pass: e.target.value }))}
              placeholder="SMTP 授权码"
              className="flex-1 px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="px-2 py-1.5 text-xs rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              {showPass ? "隐藏" : "显示"}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
            发件人名称
          </label>
          <input
            value={draft.smtp_from_name ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, smtp_from_name: e.target.value }))}
            placeholder="全球要闻简报"
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
            发件人邮箱（可选，默认用账号）
          </label>
          <input
            value={draft.smtp_from_email ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, smtp_from_email: e.target.value }))}
            placeholder="noreply@example.com"
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.smtp_secure ?? true}
            onChange={(e) => setDraft((d) => ({ ...d, smtp_secure: e.target.checked }))}
            className="rounded border-slate-600"
          />
          使用 SSL/TLS（端口 465 时建议勾选，587/STARTTLS 时按需）
        </label>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        填写完成后点击下方「保存设置」即可生效。系统优先使用此处保存的凭据；若未保存，则尝试从平台集成或环境变量读取。
      </p>
    </div>
  );
}
