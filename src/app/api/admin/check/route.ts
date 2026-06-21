import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminCookieValue } from "@/lib/admin-auth";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? null;
  const authenticated = verifyAdminCookieValue(cookie);
  return NextResponse.json({ success: true, authenticated });
}
