import { NextRequest, NextResponse } from "next/server";
import {
  listBriefingsByDate,
  listBriefingsByFilter,
  listBriefingDates,
  bulkUpsertBriefings,
  type CreateBriefingInput,
  type BriefingFilter,
} from "@/storage/database/briefings";
import { getActiveModelParam, listModelParams } from "@/storage/database/model-params";
import type { BriefingSection, ConfidenceLevel } from "@/types/briefing";

export const dynamic = "force-dynamic";

const VALID_SECTIONS: BriefingSection[] = ["long_term", "domestic_impact", "weekly_event"];
const VALID_CONFIDENCES: ConfidenceLevel[] = ["high", "medium", "low"];

function parseFilter(searchParams: URLSearchParams): BriefingFilter {
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const sectionsParam = searchParams.get("sections");
  const confidencesParam = searchParams.get("confidences");
  const keyword = searchParams.get("q");
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const sections = sectionsParam
    ? (sectionsParam
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is BriefingSection => VALID_SECTIONS.includes(s as BriefingSection)))
    : undefined;
  const confidences = confidencesParam
    ? (confidencesParam
        .split(",")
        .map((s) => s.trim())
        .filter(
          (s): s is ConfidenceLevel => VALID_CONFIDENCES.includes(s as ConfidenceLevel),
        ))
    : undefined;
  return {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sections: sections && sections.length > 0 ? sections : undefined,
    confidences: confidences && confidences.length > 0 ? confidences : undefined,
    keyword: keyword || undefined,
    limit: limitParam ? Math.min(Number(limitParam) || 200, 1000) : 200,
    offset: offsetParam ? Math.max(Number(offsetParam) || 0, 0) : 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const hasAnyFilter = searchParams.has("date_from") || searchParams.has("date_to") || searchParams.has("sections") || searchParams.has("confidences") || searchParams.has("q");
    const allDates = await listBriefingDates();

    if (date) {
      const items = await listBriefingsByDate(date);
      const activeModel = await getActiveModelParam();
      return NextResponse.json({
        success: true,
        date,
        items,
        model: activeModel,
      });
    }

    if (hasAnyFilter) {
      const filter = parseFilter(searchParams);
      const result = await listBriefingsByFilter(filter);
      return NextResponse.json({
        success: true,
        items: result.items,
        total: result.total,
        filter: {
          date_from: filter.dateFrom ?? null,
          date_to: filter.dateTo ?? null,
          sections: filter.sections ?? null,
          confidences: filter.confidences ?? null,
          keyword: filter.keyword ?? null,
        },
      });
    }

    const paramsList = await listModelParams();
    return NextResponse.json({
      success: true,
      dates: allDates,
      models: paramsList,
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
    const body = (await request.json()) as {
      items?: Partial<CreateBriefingInput>[];
    };
    if (!body?.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { success: false, error: "缺少 items 数组" },
        { status: 400 },
      );
    }
    const count = await bulkUpsertBriefings(body.items);
    return NextResponse.json({ success: true, count });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
