import { NextRequest, NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    configured: isEmailConfigured(),
  });
}
