import nodemailer from "nodemailer";
import { execSync } from "node:child_process";

let cachedConfig: { host: string; port: number; user: string; pass: string; from: string } | null = null;

function loadEmailConfigFromIdentity(): {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
} {
  if (cachedConfig) return cachedConfig;
  try {
    const out = execSync(
      "python3 -c \"from coze_workload_identity import Client; c=Client(); r=c.get_email_credentials(); print(r.get('smtp_host','')); print(r.get('smtp_port','465')); print(r.get('smtp_user','')); print(r.get('smtp_password','')); print(r.get('from_address',''))\"",
      { encoding: "utf-8", timeout: 10000 },
    );
    const lines = out.trim().split("\n");
    cachedConfig = {
      host: lines[0] ?? "",
      port: Number(lines[1] ?? "465") || 465,
      user: lines[2] ?? "",
      pass: lines[3] ?? "",
      from: lines[4] ?? "",
    };
  } catch (e) {
    cachedConfig = { host: "", port: 465, user: "", pass: "", from: "" };
  }
  return cachedConfig!;
}

export function isEmailConfigured(): boolean {
  const c = loadEmailConfigFromIdentity();
  return Boolean(c.host && c.user && c.pass);
}

export function getEmailFromAddress(): string {
  const c = loadEmailConfigFromIdentity();
  return c.from || c.user || "no-reply@example.com";
}

export interface SendEmailOptions {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const cfg = loadEmailConfigFromIdentity();
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
    await transporter.sendMail({
      from: cfg.from || cfg.user,
      to: options.to.join(", "),
      cc: options.cc?.join(", "),
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
