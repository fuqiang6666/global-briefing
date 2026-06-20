import { NextRequest, NextResponse } from "next/server";
import { listBriefingsByDate, bulkUpsertBriefings } from "@/storage/database/briefings";
import { jsonToXlsxBuffer, xlsxBufferToJson } from "@/lib/excel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const all = !date;
    const items = date ? await listBriefingsByDate(date) : [];
    const rows = items.map((b) => ({
      id: b.id,
      briefing_date: b.briefing_date,
      section: b.section,
      sort_order: b.sort_order,
      title: b.title,
      body: b.body,
      source: b.source,
      source_url: b.source_url ?? "",
      confidence: b.confidence,
      detailed_analysis: b.detailed_analysis ?? "",
      related_symbols: JSON.stringify(b.related_symbols ?? []),
      volatility_forecast: b.volatility_forecast ?? "",
      event_date: b.event_date ?? "",
    }));
    const buf = jsonToXlsxBuffer(
      rows.length > 0
        ? rows
        : [
            {
              id: "",
              briefing_date: "2024-12-31",
              section: "long_term",
              sort_order: 1,
              title: "示例标题",
              body: "示例正文（不超过 20 汉字）",
              source: "示例来源",
              source_url: "",
              confidence: "high",
              detailed_analysis: "## 详细分析\n...",
              related_symbols: "[]",
              volatility_forecast: "±0.5%~±1%",
              event_date: "",
            },
          ],
      "briefings",
    );
    const filename = all
      ? "briefings_template.xlsx"
      : `briefings_${date}.xlsx`;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
    const count = await bulkUpsertBriefings(
      rows.map((r) => {
        const row = r as Record<string, unknown>;
        let symbols: unknown[] = [];
        const raw = row.related_symbols;
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
          briefing_date: row.briefing_date as string,
          section: row.section as "long_term" | "domestic_impact" | "weekly_event",
          sort_order: Number(row.sort_order ?? 0),
          title: row.title as string,
          body: row.body as string,
          source: row.source as string,
          source_url: (row.source_url as string) ?? null,
          confidence: (row.confidence as "high" | "medium" | "low") ?? "medium",
          detailed_analysis: (row.detailed_analysis as string) ?? null,
          related_symbols: symbols as never,
          volatility_forecast: (row.volatility_forecast as string) ?? null,
          event_date: (row.event_date as string) ?? null,
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
