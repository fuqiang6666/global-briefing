"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Lock, Loader2, LogOut, ShieldCheck, AlertCircle } from "lucide-react";

interface AdminGateProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AdminGate({ children, title = "管理后台", subtitle = "该区域受密码保护" }: AdminGateProps) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/check", { cache: "no-store" });
      const ct = res.headers.get("content-type") ?? "";
      const text = await res.text();
      const json = ct.includes("application/json") ? JSON.parse(text) : null;
      setAuthed(Boolean(json?.authenticated));
    } catch {
      setAuthed(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const ct = res.headers.get("content-type") ?? "";
      const text = await res.text();
      const json = ct.includes("application/json") ? JSON.parse(text) : null;
      if (res.ok && json?.success) {
        setAuthed(true);
        setPassword("");
      } else {
        setError(json?.error ?? `登录失败（HTTP ${res.status}）`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {
      // ignore
    }
    setAuthed(false);
  }

  if (authed === null) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        正在校验...
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-[#111726] border border-[#1E2638] rounded-md p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
          </div>
          <p className="text-xs text-slate-500 mb-5">{subtitle}</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs text-slate-400">管理员密码</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="请输入管理员密码"
                className="w-full pl-9 pr-3 py-2 bg-[#0A0E1A] border border-[#1E2638] rounded-md text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 text-sm font-medium rounded-md transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              进入后台
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 z-10">
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 rounded-md transition-colors"
          title="退出后台"
        >
          <LogOut className="w-3.5 h-3.5" />
          退出后台
        </button>
      </div>
      {children}
    </div>
  );
}
