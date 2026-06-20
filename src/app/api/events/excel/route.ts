import { NextRequest, NextResponse } from "next/server";
import { listFutureEvents, bulkUpsertFutureEvents } from "@/storage/database/future-events";
import { jsonToXlsxBuffer, xlsxBufferToJson } from "@/lib/excel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listFutureEvents();
    const rows = items.map((e) => ({
      id: e.id,
      event_date: e.event_date,
      title: e.title,
      description: e.description,
      category: e.category,
      confidence: e.confidence,
      potential_impact_symbols: JSON.stringify(e.potential_impact_symbols ?? []),
      volatility_forecast: e.volatility_forecast ?? "",
      source: e.source ?? "",
      source_url: e.source_url ?? "",
      detailed_analysis: e.detailed_analysis ?? "",
      status: e.status,
    }));
    const buf = jsonToXlsxBuffer(
      rows.length > 0
        ? rows
        : [
            {
              id: "",
              event_date: "2024-12-31",
              title: "示例事件",
              description: "示例描述",
              category: "macro",
              confidence: "high",
              potential_impact_symbols: "[]",
              volatility_forecast: "±0.5%~±1%",
              source: "",
              source_url: "",
              detailed_analysis: "",
              status: "pending",
            },
          ],
      "future_events",
    );
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="future_events.xlsx"`,
      },
    });
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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "未上传文件" },
        { status: 400 },
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = xlsxBufferToJson(buffer);
    const count = await bulkUpsertFutureEvents(
      rows.map((r) => {
        const row = r as Record<string, unknown>;
        let symbols: unknown[] = [];
        const raw = row.potential_impact_symbols;
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) symbols = parsed;
          } catch {
            symbols = [];
          }
        } else if (Array.isArray(raw)) {
          symbols = raw;
        }
        return {
          id: typeof row.id === "string" && row.id ? row.id : undefined,
          event_date: row.event_date as string,
          title: row.title as string,
          description: row.description as string,
          category: (row.category as string) ?? "other",
          confidence: (row.confidence as "high" | "medium" | "low") ?? "medium",
          potential_impact_symbols: symbols as never,
          volatility_forecast: (row.volatility_forecast as string) ?? null,
          source: (row.source as string) ?? null,
          source_url: (row.source_url as string) ?? null,
          detailed_analysis: (row.detailed_analysis as string) ?? null,
          status:
            (row.status as "pending" | "confirmed" | "completed" | "cancelled") ??
            "pending",
        };
      }),
    );
    return NextResponse.json({ success: true, count });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
