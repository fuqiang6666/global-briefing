// Health check endpoint used by test_run
import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("media_sources").select("id").limit(1);
    if (error) {
      return NextResponse.json(
        { status: "degraded", database: error.message },
        { status: 503 },
      );
    }
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { status: "error", error: message },
      { status: 500 },
    );
  }
}
