import { NextRequest, NextResponse } from "next/server";
import { getEmailConfigInfo } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const info = await getEmailConfigInfo();
  return NextResponse.json({
    success: true,
    configured: info.configured,
    source: info.source,
    host: info.host,
    port: info.port,
    user: info.user,
    fromName: info.fromName,
    fromEmail: info.fromEmail,
  });
}
