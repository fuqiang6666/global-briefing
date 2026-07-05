/**
 * 产业分析报告下载 API
 * 生成 HTML 格式的产业分析报告供下载
 */
import { NextRequest, NextResponse } from "next/server";
import { listIndustryAnalysisByDate } from "@/storage/database/industry-analysis";
import { todayDateString } from "@/lib/date";
import type { IndustryAnalysis } from "@/types/briefing";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get("date") || todayDateString();

  try {
    const items = await listIndustryAnalysisByDate(date);
    
    if (items.length === 0) {
      return NextResponse.json({ error: "该日期无产业分析数据" }, { status: 404 });
    }

    const html = generateReportHtml(date, items);
    
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="industry-report-${date}.html"`,
      },
    });
  } catch (error) {
    console.error("[industry-analysis/download] error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "生成报告失败", details: errorMessage }, { status: 500 });
  }
}

function generateReportHtml(date: string, items: IndustryAnalysis[]): string {
  const confidenceLabels: Record<string, string> = { high: "高", medium: "中", low: "低" };
  
  const itemsHtml = items.map((ind, idx) => {
    const confidence = ind.confidence || "medium";
    const confidenceLabel = confidenceLabels[confidence] || "中";
    
    let symbolsHtml = "";
    if (ind.related_symbols && ind.related_symbols.length > 0) {
      symbolsHtml = `<div class="symbols">${ind.related_symbols.map(s => {
        const impactClass = s.impact === "positive" ? "symbol-positive" : s.impact === "negative" ? "symbol-negative" : "symbol-neutral";
        const arrow = s.impact === "positive" ? " ↑" : s.impact === "negative" ? " ↓" : "";
        return `<span class="symbol ${impactClass}">${s.name}${arrow}</span>`;
      }).join("")}</div>`;
    }
    
    let deepAnalysisHtml = "";
    if (ind.financial_report_analysis || ind.competitive_landscape || (ind.key_companies && ind.key_companies.length > 0)) {
      const financialHtml = ind.financial_report_analysis ? `
        <div class="module highlight-module">
          <div class="module-title">📊 龙头企业财报</div>
          <div class="module-content">${ind.financial_report_analysis}</div>
        </div>` : "";
      
      const competitiveHtml = ind.competitive_landscape ? `
        <div class="module">
          <div class="module-title">🎯 竞争格局</div>
          <div class="module-content">${ind.competitive_landscape}</div>
        </div>` : "";
      
      let companiesHtml = "";
      if (ind.key_companies && ind.key_companies.length > 0) {
        const rows = ind.key_companies.map(c => `
          <tr>
            <td class="name">${c.name}</td>
            <td class="code">${c.code}</td>
            <td>${c.market_cap}</td>
            <td class="growth">${c.revenue_growth}</td>
            <td>${c.position}</td>
          </tr>`).join("");
        companiesHtml = `
        <div class="module">
          <div class="module-title">🏢 关键企业</div>
          <table>
            <thead><tr><th>公司</th><th>代码</th><th>市值</th><th>营收增速</th><th>行业地位</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      }
      
      deepAnalysisHtml = `
        <div class="section-title" style="margin-top: 24px;">🏢 深度分析</div>
        ${financialHtml}${competitiveHtml}${companiesHtml}`;
    }
    
    let investmentHtml = "";
    if (ind.investment_suggestion || ind.risk_warning) {
      const suggestionHtml = ind.investment_suggestion ? `
        <div class="investment-box">
          <div class="title">💡 投资建议</div>
          <div class="module-content">${ind.investment_suggestion}</div>
        </div>` : "";
      const riskHtml = ind.risk_warning ? `
        <div class="risk-box">
          <div class="title">⚠️ 风险提示</div>
          <div class="module-content">${ind.risk_warning}</div>
        </div>` : "";
      investmentHtml = `<div style="margin-top: 16px;">${suggestionHtml}${riskHtml}</div>`;
    }
    
    let outlookHtml = "";
    if (ind.market_outlook) {
      outlookHtml = `
        <div class="section-title" style="margin-top: 24px;">🔮 市场展望</div>
        <div class="module"><div class="module-content">${ind.market_outlook}</div></div>`;
    }
    
    const sourceLink = ind.source_url ? ` · <a href="${ind.source_url}" target="_blank" style="color: #d4a24c;">原文链接</a>` : "";
    
    return `
    <div class="industry-card">
      <div class="industry-header">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-family: monospace; color: #d4a24c; font-size: 12px;">#${String(idx + 1).padStart(2, "0")}</span>
          <span class="badge badge-${confidence}">置信度 · ${confidenceLabel}</span>
        </div>
        <h2>${ind.industry_name}</h2>
        ${symbolsHtml}
      </div>
      
      <div class="content">
        <div class="section-title">📊 基础分析</div>
        
        <div class="module">
          <div class="module-title">📋 政策分析</div>
          <div class="module-content">${ind.policy_analysis}</div>
        </div>
        
        <div class="module">
          <div class="module-title">🔗 产业链分析</div>
          <div class="module-content">${ind.chain_analysis}</div>
        </div>
        
        <div class="module">
          <div class="module-title">🏭 产能重点</div>
          <div class="module-content">${ind.capacity_focus}</div>
        </div>
        
        <div class="module">
          <div class="module-title">💡 技术发展</div>
          <div class="module-content">${ind.tech_development}</div>
        </div>
        
        ${deepAnalysisHtml}
        ${investmentHtml}
        ${outlookHtml}
        
        <div class="source">
          出处：${ind.source || "—"}${sourceLink}
        </div>
      </div>
    </div>`;
  }).join("");
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>热点产业深度分析报告 - ${date}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #0a0e1a;
      color: #e8eaf0;
      line-height: 1.6;
      padding: 40px 20px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 1px solid #1e2638;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 28px; color: #d4a24c; margin-bottom: 10px; }
    .header .date { font-family: monospace; color: #7b8499; font-size: 14px; }
    .header .subtitle { color: #7b8499; font-size: 13px; margin-top: 8px; }
    .industry-card {
      background: #111726;
      border: 1px solid #1e2638;
      border-radius: 8px;
      margin-bottom: 24px;
      overflow: hidden;
    }
    .industry-header {
      padding: 20px;
      border-bottom: 1px solid #1e2638;
      background: linear-gradient(135deg, #111726 0%, #1a2035 100%);
    }
    .industry-header h2 { font-size: 20px; color: #e8eaf0; margin-bottom: 8px; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-high { background: rgba(61, 163, 122, 0.15); color: #3da37a; }
    .badge-medium { background: rgba(212, 162, 76, 0.15); color: #d4a24c; }
    .badge-low { background: rgba(212, 92, 92, 0.15); color: #d45c5c; }
    .symbols { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .symbol {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
    }
    .symbol-positive { background: rgba(61, 163, 122, 0.15); color: #3da37a; }
    .symbol-negative { background: rgba(212, 92, 92, 0.15); color: #d45c5c; }
    .symbol-neutral { background: rgba(123, 132, 153, 0.15); color: #7b8499; }
    .content { padding: 20px; }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #d4a24c;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #1e2638;
    }
    .module {
      margin-bottom: 16px;
      padding: 12px;
      background: rgba(30, 38, 56, 0.3);
      border-radius: 6px;
    }
    .module-title {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #d4a24c;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .module-content { color: #c8ccd4; font-size: 13px; line-height: 1.7; }
    .highlight-module {
      background: rgba(212, 162, 76, 0.05);
      border: 1px solid rgba(212, 162, 76, 0.1);
    }
    .investment-box {
      background: rgba(61, 163, 122, 0.05);
      border: 1px solid rgba(61, 163, 122, 0.2);
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .investment-box .title { color: #3da37a; font-size: 12px; font-weight: 500; margin-bottom: 6px; }
    .risk-box {
      background: rgba(212, 92, 92, 0.05);
      border: 1px solid rgba(212, 92, 92, 0.2);
      padding: 12px;
      border-radius: 6px;
    }
    .risk-box .title { color: #d45c5c; font-size: 12px; font-weight: 500; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th { text-align: left; padding: 8px; color: #7b8499; font-weight: 500; border-bottom: 1px solid #1e2638; }
    td { padding: 8px; border-bottom: 1px solid rgba(30, 38, 56, 0.5); }
    td.name { color: #e8eaf0; font-weight: 500; }
    td.code { color: #7b8499; font-family: monospace; }
    td.growth { color: #3da37a; font-family: monospace; }
    .footer {
      text-align: center;
      padding: 20px;
      color: #7b8499;
      font-size: 12px;
      border-top: 1px solid #1e2638;
      margin-top: 30px;
    }
    .source {
      font-size: 12px;
      color: #7b8499;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #1e2638;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>热点产业深度分析报告</h1>
      <div class="date">${date}</div>
      <div class="subtitle">政策 · 产业链 · 产能 · 技术 · 财报 · 竞争格局 · 投资建议</div>
    </div>
    
    ${itemsHtml}
    
    <div class="footer">
      <p>本报告由 AI 自动生成，仅供参考，不构成投资建议</p>
      <p style="margin-top: 8px;">生成时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</p>
    </div>
  </div>
</body>
</html>`;
}
