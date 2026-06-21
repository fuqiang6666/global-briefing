import { NextRequest, NextResponse } from "next/server";
import {
  listBriefingsByDate,
  listBriefingsByFilter,
  bulkUpsertBriefings,
  type BriefingFilter,
} from "@/storage/database/briefings";
import { jsonToXlsxBuffer, xlsxBufferToJson } from "@/lib/excel";
import type { Briefing, BriefingSection, ConfidenceLevel } from "@/types/briefing";

export const dynamic = "force-dynamic";

const VALID_SECTIONS: BriefingSection[] = ["long_term", "domestic_impact", "weekly_event"];
const VALID_CONFIDENCES: ConfidenceLevel[] = ["high", "medium", "low"];

function parseFilter(searchParams: URLSearchParams): BriefingFilter | null {
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const date = searchParams.get("date");
  const sectionsParam = searchParams.get("sections");
  const confidencesParam = searchParams.get("confidences");
  const keyword = searchParams.get("q");
  if (!date && !dateFrom && !dateTo && !sectionsParam && !confidencesParam && !keyword) {
    return null;
  }
  const sections = sectionsParam
    ? sectionsParam
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is BriefingSection => VALID_SECTIONS.includes(s as BriefingSection))
    : undefined;
  const confidences = confidencesParam
    ? confidencesParam
        .split(",")
        .map((s) => s.trim())
        .filter(
          (s): s is ConfidenceLevel => VALID_CONFIDENCES.includes(s as ConfidenceLevel),
        )
    : undefined;
  return {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sections: sections && sections.length > 0 ? sections : undefined,
    confidences: confidences && confidences.length > 0 ? confidences : undefined,
    keyword: keyword || undefined,
    limit: 5000,
    offset: 0,
  };
}

function buildFilename(filter: BriefingFilter | null, singleDate: string | null): string {
  if (singleDate) return `briefings_${singleDate}.xlsx`;
  if (!filter) return "briefings_template.xlsx";
  const parts: string[] = ["briefings"];
  if (filter.dateFrom) parts.push(`from_${filter.dateFrom}`);
  if (filter.dateTo) parts.push(`to_${filter.dateTo}`);
  if (filter.sections && filter.sections.length > 0) parts.push(`sec_${filter.sections.join("-")}`);
  if (filter.confidences && filter.confidences.length > 0)
    parts.push(`conf_${filter.confidences.join("-")}`);
  if (filter.keyword) {
    const kw = filter.keyword
      .replace(/[^\w\u4e00-\u9fa5]/g, "_")
      .slice(0, 30);
    const kwAscii = Buffer.from(kw, "utf8").toString("ascii").replace(/[^\x20-\x7E]/g, "_");
    if (kwAscii) parts.push(`kw_${kwAscii}`);
  }
  return `${parts.join("_")}.xlsx`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const filter = parseFilter(searchParams);
    let items: Briefing[];
    if (date) {
      items = await listBriefingsByDate(date);
    } else if (filter) {
      const result = await listBriefingsByFilter(filter);
      items = result.items;
    } else {
      items = [];
    }
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
              volatility_forecast: "+0.5%~+1%",
              event_date: "",
            },
          ],
      "briefings",
    );
    const filename = buildFilename(filter, date);
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
