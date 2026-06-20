// Email helper using nodemailer with credentials from coze_workload_identity

import nodemailer, { Transporter } from "nodemailer";
import { execSync } from "child_process";

interface EmailCredentials {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  fromAddress: string;
  fromName: string;
}

let cachedCredentials: EmailCredentials | null = null;
let cachedTransporter: Transporter | null = null;

function loadEnvFromPython(): void {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    return;
  }
  try {
    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;
    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const lines = output.trim().split("\n");
    for (const line of lines) {
      if (line.startsWith("#")) continue;
      const eqIndex = line.indexOf("=");
      if (eqIndex <= 0) continue;
      const key = line.substring(0, eqIndex);
      let value = line.substring(eqIndex + 1);
      if (
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (e) {
    // env may already be set
  }
}

function readCredentials(): EmailCredentials {
  loadEnvFromPython();
  if (cachedCredentials) return cachedCredentials;

  const smtpHost = process.env.SMTP_HOST || process.env.SMTP_HOSTNAME;
  const smtpPortStr = process.env.SMTP_PORT || "465";
  const smtpPort = Number.parseInt(smtpPortStr, 10) || 465;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_PASS;
  const smtpSecure = (process.env.SMTP_SECURE ?? "true") === "true";
  const fromAddress = process.env.SMTP_FROM || smtpUser || "";
  const fromName = process.env.SMTP_FROM_NAME || "每日全球要闻简报";

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error(
      "SMTP 凭据未配置。请确认环境中存在 SMTP_HOST / SMTP_USER / SMTP_PASS。",
    );
  }
  cachedCredentials = {
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpSecure,
    fromAddress,
    fromName,
  };
  return cachedCredentials;
}

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  const creds = readCredentials();
  cachedTransporter = nodemailer.createTransport({
    host: creds.smtpHost,
    port: creds.smtpPort,
    secure: creds.smtpSecure,
    auth: {
      user: creds.smtpUser,
      pass: creds.smtpPass,
    },
  });
  return cachedTransporter;
}

export interface SendEmailOptions {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ messageId: string }> {
  const creds = readCredentials();
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: `"${creds.fromName}" <${creds.fromAddress}>`,
    to: opts.to.join(", "),
    cc: opts.cc && opts.cc.length > 0 ? opts.cc.join(", ") : undefined,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  return { messageId: info.messageId };
}

export function isEmailConfigured(): boolean {
  try {
    readCredentials();
    return true;
  } catch {
    return false;
  }
}
