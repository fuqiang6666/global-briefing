import nodemailer from "nodemailer";
import { execSync } from "node:child_process";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export interface ResolvedSmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  source: "database" | "identity" | "env" | "none";
}

let cachedConfig: ResolvedSmtpConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

function loadEmailConfigFromIdentity(): ResolvedSmtpConfig {
  try {
    const out = execSync(
      "python3 -c \"from coze_workload_identity import Client; c=Client(); r=c.get_email_credentials(); print(r.get('smtp_host','')); print(r.get('smtp_port','465')); print(r.get('smtp_user','')); print(r.get('smtp_password','')); print(r.get('from_address',''))\"",
      { encoding: "utf-8", timeout: 10000 },
    );
    const lines = out.trim().split("\n");
    return {
      host: lines[0] ?? "",
      port: Number(lines[1] ?? "465") || 465,
      user: lines[2] ?? "",
      pass: lines[3] ?? "",
      fromName: "全球要闻简报",
      fromEmail: lines[4] ?? "",
      source: "identity" as const,
    };
  } catch {
    return {
      host: "",
      port: Number(process.env.SMTP_PORT ?? "465") || 465,
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
      fromName: process.env.SMTP_FROM_NAME ?? "全球要闻简报",
      fromEmail: process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER ?? "",
      source: "env" as const,
    };
  }
}

async function loadEmailConfigFromDatabase(): Promise<ResolvedSmtpConfig | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("email_settings")
      .select("smtp_host,smtp_port,smtp_user,smtp_pass,smtp_secure,smtp_from_name,smtp_from_email")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    const row = data as {
      smtp_host: string | null;
      smtp_port: number | null;
      smtp_user: string | null;
      smtp_pass: string | null;
      smtp_secure: boolean | null;
      smtp_from_name: string | null;
      smtp_from_email: string | null;
    };
    if (!row.smtp_host || !row.smtp_user || !row.smtp_pass) return null;
    const port = row.smtp_port ?? 465;
    // smtp_secure 字段优先；为空时按端口推断（465=true；587 STARTTLS=false）
    const secure =
      row.smtp_secure !== null && row.smtp_secure !== undefined
        ? Boolean(row.smtp_secure)
        : port === 465;
    return {
      host: row.smtp_host,
      port,
      user: row.smtp_user,
      pass: row.smtp_pass,
      fromName: row.smtp_from_name ?? "全球要闻简报",
      fromEmail: row.smtp_from_email ?? row.smtp_user,
      source: "database",
      // 透传 secure 供 sendEmail 使用
      ...(secure !== undefined ? { _secure: secure } : {}),
    } as ResolvedSmtpConfig & { _secure?: boolean };
  } catch {
    return null;
  }
}

export async function resolveSmtpConfig(): Promise<ResolvedSmtpConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }
  const fromDb = await loadEmailConfigFromDatabase();
  if (fromDb) {
    cachedConfig = fromDb;
    cacheTimestamp = now;
    return fromDb;
  }
  const fromIdentity = loadEmailConfigFromIdentity();
  cachedConfig = fromIdentity;
  cacheTimestamp = now;
  return fromIdentity;
}

export function clearSmtpCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}

export async function isEmailConfigured(): Promise<boolean> {
  const c = await resolveSmtpConfig();
  return Boolean(c.host && c.user && c.pass);
}

export async function getEmailFromAddress(): Promise<string> {
  const c = await resolveSmtpConfig();
  return c.fromEmail || c.user || "no-reply@example.com";
}

export async function getEmailFromName(): Promise<string> {
  const c = await resolveSmtpConfig();
  return c.fromName || "全球要闻简报";
}

export interface SendEmailOptions {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{
  ok: boolean;
  error?: string;
  source?: ResolvedSmtpConfig["source"];
}> {
  const cfg = await resolveSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { ok: false, error: "SMTP 凭据未配置" };
  }
  try {
    const port = cfg.port || 465;
    const explicitSecure = (cfg as ResolvedSmtpConfig & { _secure?: boolean })._secure;
    const secure = explicitSecure !== undefined ? explicitSecure : port === 465;
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port,
      secure,
      auth: { user: cfg.user, pass: cfg.pass },
      // QQ/163/阿里等国内邮件服务经常使用自签 CA；
      // 在生产端可改为严格校验，这里默认放行以提升发送成功率。
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    const fromName = cfg.fromName || "全球要闻简报";
    const fromEmail = cfg.fromEmail || cfg.user;
    // 验证 SMTP 凭据是否可用（避免鉴权失败时发送大量退信）
    try {
      await transporter.verify();
    } catch (verifyErr: unknown) {
      const vmsg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
      return {
        ok: false,
        error: `SMTP 验证失败：${vmsg}（请检查主机/端口/账号/授权码是否正确）`,
      };
    }
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to.join(", "),
      cc: options.cc?.join(", "),
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return { ok: true, source: cfg.source };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `${msg}（若提示 EAUTH/认证失败，请确认是 SMTP 授权码而非登录密码；若提示 ECONNECTION/EAI_AGAIN，请检查主机或网络）`,
    };
  }
}

/**
 * 仅测试 SMTP 连接与鉴权，不发送任何邮件。
 * 用于「测试连接」按钮，避免误发邮件的前提下验证凭据。
 */
export async function testSmtpConnection(): Promise<{
  ok: boolean;
  error?: string;
  source?: ResolvedSmtpConfig["source"];
  host?: string;
  port?: number;
  user?: string;
}> {
  const cfg = await resolveSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { ok: false, error: "SMTP 凭据未配置" };
  }
  try {
    const port = cfg.port || 465;
    const explicitSecure = (cfg as ResolvedSmtpConfig & { _secure?: boolean })._secure;
    const secure = explicitSecure !== undefined ? explicitSecure : port === 465;
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port,
      secure,
      auth: { user: cfg.user, pass: cfg.pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
    });
    await transporter.verify();
    return {
      ok: true,
      source: cfg.source,
      host: cfg.host,
      port,
      user: cfg.user,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `${msg}`,
    };
  }
}
