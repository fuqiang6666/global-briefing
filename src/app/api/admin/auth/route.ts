import { NextRequest, NextResponse } from "next/server";
import { buildAdminCookieValue, checkPassword, ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE } from "@/lib/admin-auth";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "请求体必须为 JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "请求体格式错误" }, { status: 400 });
  }
  const password = (body as { password?: unknown }).password;
  if (typeof password !== "string" || password.length === 0 || password.length > 128) {
    return NextResponse.json({ success: false, error: "请输入密码" }, { status: 400 });
  }
  if (!checkPassword(password)) {
    return NextResponse.json({ success: false, error: "密码错误" }, { status: 401 });
  }
  const value = buildAdminCookieValue();
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
