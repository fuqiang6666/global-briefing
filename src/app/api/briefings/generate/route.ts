import { NextRequest, NextResponse } from "next/server";
import { generateBriefingForDate } from "@/lib/generate-briefing";
import { createBriefing, deleteBriefingsByDate } from "@/storage/database/briefings";
import { createIndustryAnalysisBatch, deleteIndustryAnalysisByDate } from "@/storage/database/industry-analysis";
import { todayDateString } from "@/lib/date";
import type { IndustryAnalysisInsert } from "@/types/briefing";

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
      await deleteIndustryAnalysisByDate(date);
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

    // 保存产业分析数据
    let industryCount = 0;
    if (result.industry_analysis && result.industry_analysis.length > 0) {
      const industryItems = result.industry_analysis.map((ind) => ({
        analysis_date: date,
        industry_name: ind.industry_name,
        policy_analysis: ind.policy_analysis,
        chain_analysis: ind.chain_analysis,
        capacity_focus: ind.capacity_focus,
        tech_development: ind.tech_development,
        market_outlook: ind.market_outlook,
        related_symbols: ind.related_symbols,
        confidence: ind.confidence,
        source: ind.source,
        source_url: ind.source_url,
        // 新增深度分析字段
        financial_report_analysis: ind.financial_report_analysis ?? null,
        competitive_landscape: ind.competitive_landscape ?? null,
        key_companies: ind.key_companies ?? null,
        investment_suggestion: ind.investment_suggestion ?? null,
        risk_warning: ind.risk_warning ?? null,
      }));
      await createIndustryAnalysisBatch(industryItems as IndustryAnalysisInsert[]);
      industryCount = industryItems.length;
    }

    return NextResponse.json({
      success: true,
      date,
      count: created.length,
      industry_count: industryCount,
      industry_analysis: result.industry_analysis || [],
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
