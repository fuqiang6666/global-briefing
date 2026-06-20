import { NextRequest, NextResponse } from "next/server";
import {
  listFutureEvents,
  createFutureEvent,
} from "@/storage/database/future-events";
import { jsonToXlsxBuffer, xlsxBufferToJson } from "@/lib/excel";
import { bulkUpsertFutureEvents } from "@/storage/database/future-events";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listFutureEvents();
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
    const created = await createFutureEvent({
      event_date: body.event_date,
      title: body.title,
      description: body.description,
      category: body.category ?? "other",
      confidence: body.confidence ?? "medium",
      potential_impact_symbols: body.potential_impact_symbols ?? [],
      volatility_forecast: body.volatility_forecast ?? null,
      source: body.source ?? null,
      source_url: body.source_url ?? null,
      detailed_analysis: body.detailed_analysis ?? null,
      status: body.status ?? "pending",
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
