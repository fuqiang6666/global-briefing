import { NextRequest, NextResponse } from "next/server";
import { listIndustryAnalysisByDate, createIndustryAnalysis } from "@/storage/database/industry-analysis";
import type { IndustryAnalysisInsert } from "@/types/briefing";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  try {
    const items = await listIndustryAnalysisByDate(date);
    return NextResponse.json({ items, total: items.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const item: IndustryAnalysisInsert = {
      analysis_date: body.date || new Date().toISOString().slice(0, 10),
      sort_order: body.sort_order || 0,
      industry_name: body.industry_name,
      policy_analysis: body.policy_analysis,
      chain_analysis: body.chain_analysis,
      capacity_focus: body.capacity_focus,
      tech_development: body.tech_development,
      market_outlook: body.market_outlook || null,
      related_symbols: body.related_symbols || null,
      confidence: body.confidence || "medium",
      source: body.source || null,
      source_url: body.source_url || null,
    };
    const created = await createIndustryAnalysis(item);
    return NextResponse.json({ item: created });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}