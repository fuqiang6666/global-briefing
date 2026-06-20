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
    return {
      host: row.smtp_host,
      port: row.smtp_port ?? 465,
      user: row.smtp_user,
      pass: row.smtp_pass,
      fromName: row.smtp_from_name ?? "全球要闻简报",
      fromEmail: row.smtp_from_email ?? row.smtp_user,
      source: "database",
    };
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
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    const fromName = cfg.fromName || "全球要闻简报";
    const fromEmail = cfg.fromEmail || cfg.user;
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
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
