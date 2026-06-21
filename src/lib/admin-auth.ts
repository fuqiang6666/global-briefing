import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "gb_admin";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 小时
const DEFAULT_PASSWORD = "fu57124";

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? "global-briefing-admin-secret";
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function buildAdminCookieValue(): string {
  const issuedAt = Date.now();
  const payload = `${issuedAt}.${Math.random().toString(36).slice(2, 10)}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyAdminCookieValue(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [issuedAtStr, nonce, sig] = parts;
  if (!issuedAtStr || !nonce || !sig) return false;
  const expected = sign(`${issuedAtStr}.${nonce}`);
  const sigBuf = Buffer.from(sig, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length) return false;
  if (!timingSafeEqual(sigBuf, expBuf)) return false;
  const issuedAt = Number.parseInt(issuedAtStr, 10);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > SESSION_MAX_AGE * 1000) return false;
  return true;
}

export function checkPassword(input: string): boolean {
  const expected = getAdminPassword();
  const a = Buffer.from(input, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    // 仍然进行常量时间比较，避免长度泄露
    const padded = Buffer.concat([a, Buffer.alloc(Math.max(0, b.length - a.length))]);
    timingSafeEqual(padded, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE = SESSION_MAX_AGE;
