import { NextRequest, NextResponse } from "next/server";
import { listModelParams, createModelParam, getActiveModelParam } from "@/storage/database/model-params";
import { getNextModelVersion } from "@/storage/database/model-params";
import { llmInvoke } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    if (activeOnly) {
      const active = await getActiveModelParam();
      return NextResponse.json({ success: true, item: active });
    }
    const items = await listModelParams();
    return NextResponse.json({ success: true, items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const version = await getNextModelVersion();
    const created = await createModelParam({
      version,
      is_active: body.is_active ?? false,
      keywords: body.keywords ?? [],
      topic_preferences: body.topic_preferences ?? [],
      exclude_words: body.exclude_words ?? [],
      long_term_count: body.long_term_count ?? 2,
      domestic_impact_count: body.domestic_impact_count ?? 3,
      weekly_event_count: body.weekly_event_count ?? 5,
      min_auth_level: body.min_auth_level ?? 3,
      time_window_hours: body.time_window_hours ?? 48,
      note: body.note ?? null,
      created_by: body.created_by ?? "manual",
    });
    return NextResponse.json({ success: true, item: created });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
