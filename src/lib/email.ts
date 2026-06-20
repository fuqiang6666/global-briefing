// Email helper - re-exports from email-client and provides higher-level helpers

import { sendEmail as sendEmailRaw, isEmailConfigured as isEmailConfiguredRaw, resolveSmtpConfig, clearSmtpCache } from "@/lib/email-client";

export interface SendEmailOptions {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ messageId: string }> {
  const result = await sendEmailRaw({
    to: opts.to,
    cc: opts.cc,
    subject: opts.subject,
    text: opts.text ?? "",
    html: opts.html,
  });
  if (!result.ok) {
    throw new Error(result.error || "邮件发送失败");
  }
  return { messageId: `sent-${Date.now()}` };
}

export async function isEmailConfigured(): Promise<boolean> {
  return isEmailConfiguredRaw();
}

export async function getEmailConfigInfo(): Promise<{
  configured: boolean;
  source: "database" | "identity" | "env" | "none";
  host: string;
  port: number;
  user: string;
  fromName: string;
  fromEmail: string;
}> {
  const cfg = await resolveSmtpConfig();
  return {
    configured: Boolean(cfg.host && cfg.user && cfg.pass),
    source: cfg.source,
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    fromName: cfg.fromName,
    fromEmail: cfg.fromEmail,
  };
}

export function resetEmailConfigCache(): void {
  clearSmtpCache();
}
