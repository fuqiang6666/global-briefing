import { NextRequest, NextResponse } from "next/server";
import { generateBriefingForDate } from "@/lib/generate-briefing";
import { createBriefing, deleteBriefingsByDate } from "@/storage/database/briefings";
import { todayDateString } from "@/lib/date";

export const dynamic = "force-dynamic";
// Allow up to 3 minutes for the generation pipeline (web search + LLM)
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const date = (body?.date as string) || todayDateString();
    const replace = body?.replace === true;
    const result = await generateBriefingForDate(date);

    if (replace) {
      await deleteBriefingsByDate(date);
    }
    const created: unknown[] = [];
    for (const item of result.items) {
      const row = await createBriefing({
        briefing_date: date,
        section: item.section,
        sort_order: item.sort_order,
        title: item.title,
        body: item.body,
        source: item.source,
        source_url: item.source_url,
        confidence: item.confidence,
        detailed_analysis: item.detailed_analysis,
        related_symbols: item.related_symbols,
        volatility_forecast: item.volatility_forecast,
        event_date: item.event_date,
      });
      created.push(row);
    }
    return NextResponse.json({
      success: true,
      date,
      count: created.length,
      modelVersion: result.modelVersion,
      searches: result.searches,
      usedSources: result.usedSources,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
