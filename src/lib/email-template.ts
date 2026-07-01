// 每日简报邮件模板（HTML / 纯文本）
import type { Briefing, EmailSettings, IndustryAnalysis } from "@/types/briefing";
import { SECTION_LABELS, CONFIDENCE_LABELS, SECTION_ORDER } from "@/types/briefing";
import { parseVolatilityForecast } from "@/types/briefing";

const VOLATILITY_COLORS = {
  up: { bg: "rgba(61, 163, 122, 0.18)", fg: "#3DA37A" },
  down: { bg: "rgba(212, 92, 92, 0.18)", fg: "#D45C5C" },
  neutral: { bg: "rgba(123, 132, 153, 0.18)", fg: "#7B8499" },
} as const;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function confidenceClass(level: string): string {
  if (level === "high") return "c-high";
  if (level === "medium") return "c-medium";
  return "c-low";
}

function groupBySection(items: Briefing[]): Array<{
  section: string;
  label: string;
  list: Briefing[];
}> {
  const map = new Map<string, Briefing[]>();
  for (const it of items) {
    const arr = map.get(it.section) ?? [];
    arr.push(it);
    map.set(it.section, arr);
  }
  return SECTION_ORDER.filter((s) => map.has(s)).map((s) => ({
    section: s,
    label: SECTION_LABELS[s] ?? s,
    list: (map.get(s) ?? []).sort((a, b) => a.sort_order - b.sort_order),
  }));
}

// 产业分析 HTML 模板
function buildIndustryAnalysisHtml(items: IndustryAnalysis[]): string {
  if (!items || items.length === 0) return "";
  
  return items.map((ind, idx) => {
    const confidenceStyle = ind.confidence === "high"
      ? "background:rgba(61,163,122,0.15);color:#3DA37A;"
      : ind.confidence === "medium"
      ? "background:rgba(212,162,76,0.18);color:#D4A24C;"
      : "background:rgba(123,132,153,0.18);color:#7B8499;";
    
    const relatedSymbols = ind.related_symbols?.length > 0
      ? ind.related_symbols.map(s => `${s.name}(${s.impact === "positive" ? "+" : s.impact === "negative" ? "-" : "~"})`).join(" ")
      : "";
    
    return `
      <tr>
        <td style="padding:20px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111726;border:1px solid #1E2638;border-radius:6px;padding:16px;">
            <tr>
              <td style="padding:12px 16px;">
                <div style="font-size:13px;color:#7B8499;margin-bottom:6px;">
                  <span style="color:#D4A24C;font-weight:600;">#${String(idx + 1).padStart(2, "0")}</span>
                  <span style="display:inline-block;padding:1px 8px;margin-left:8px;font-size:11px;font-weight:600;border-radius:3px;${confidenceStyle}">置信度 · ${CONFIDENCE_LABELS[ind.confidence] ?? ind.confidence}</span>
                </div>
                <div style="font-size:18px;color:#E8EAF0;font-weight:600;margin-bottom:12px;">${escapeHtml(ind.industry_name)} · 热点产业分析</div>
                
                <div style="margin-bottom:12px;">
                  <div style="font-size:13px;color:#D4A24C;font-weight:600;margin-bottom:4px;">▎政策分析</div>
                  <div style="font-size:14px;color:#A6ADC0;line-height:1.6;">${escapeHtml(ind.policy_analysis)}</div>
                </div>
                
                <div style="margin-bottom:12px;">
                  <div style="font-size:13px;color:#D4A24C;font-weight:600;margin-bottom:4px;">▎产业链分析</div>
                  <div style="font-size:14px;color:#A6ADC0;line-height:1.6;">${escapeHtml(ind.chain_analysis)}</div>
                </div>
                
                <div style="margin-bottom:12px;">
                  <div style="font-size:13px;color:#D4A24C;font-weight:600;margin-bottom:4px;">▎产能重点</div>
                  <div style="font-size:14px;color:#A6ADC0;line-height:1.6;">${escapeHtml(ind.capacity_focus)}</div>
                </div>
                
                <div style="margin-bottom:12px;">
                  <div style="font-size:13px;color:#D4A24C;font-weight:600;margin-bottom:4px;">▎技术发展</div>
                  <div style="font-size:14px;color:#A6ADC0;line-height:1.6;">${escapeHtml(ind.tech_development)}</div>
                </div>
                
                ${ind.market_outlook ? `
                <div style="margin-bottom:12px;">
                  <div style="font-size:13px;color:#D4A24C;font-weight:600;margin-bottom:4px;">▎市场展望</div>
                  <div style="font-size:14px;color:#A6ADC0;line-height:1.6;">${escapeHtml(ind.market_outlook)}</div>
                </div>` : ""}
                
                ${relatedSymbols ? `
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid #1E2638;">
                  <div style="font-size:12px;color:#7B8499;">
                    <span style="color:#D4A24C;">相关标的：</span> ${escapeHtml(relatedSymbols)}
                  </div>
                </div>` : ""}
                
                <div style="font-size:12px;color:#7B8499;margin-top:8px;">
                  出处 · ${escapeHtml(ind.source || "—")}
                  ${ind.source_url ? ` · <a href="${escapeHtml(ind.source_url)}" style="color:#D4A24C;text-decoration:none;">原文</a>` : ""}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join("");
}

export function buildEmailHtml(
  date: string,
  items: Briefing[],
  settings: EmailSettings,
  domain: string,
  industryItems: IndustryAnalysis[] = [],
): string {
  const groups = groupBySection(items);
  const sectionsHtml = groups
    .map((g, gIdx) => {
      const itemsHtml = g.list
        .map((it, idx) => {
          const vola = parseVolatilityForecast(it.volatility_forecast, it.related_symbols);
          const color = VOLATILITY_COLORS[vola.direction];
          const detailUrl = domain
            ? `${domain.replace(/\/$/, "")}/?date=${date}&item=${it.id}`
            : `/?date=${date}&item=${it.id}`;
          return `
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid #1E2638;">
                <div style="font-size:13px;color:#7B8499;margin-bottom:4px;">
                  <span style="color:#D4A24C;font-weight:600;">#${String(gIdx + 1).padStart(2, "0")}-${String(idx + 1).padStart(2, "0")}</span>
                  <span class="${confidenceClass(it.confidence)}" style="display:inline-block;padding:1px 8px;margin-left:8px;font-size:11px;font-weight:600;border-radius:3px;${
                    it.confidence === "high"
                      ? "background:rgba(61,163,122,0.15);color:#3DA37A;"
                      : it.confidence === "medium"
                      ? "background:rgba(212,162,76,0.18);color:#D4A24C;"
                      : "background:rgba(123,132,153,0.18);color:#7B8499;"
                  }">置信度 · ${CONFIDENCE_LABELS[it.confidence] ?? it.confidence}</span>
                </div>
                <div style="font-size:15px;color:#E8EAF0;line-height:1.7;font-weight:500;margin-bottom:6px;">${escapeHtml(it.title)}</div>
                <div style="font-size:13px;color:#A6ADC0;line-height:1.7;margin-bottom:8px;">${escapeHtml(it.body)}</div>
                ${vola.chip ? `
                <div style="margin-bottom:8px;">
                  <span style="display:inline-block;padding:2px 10px;background:${color.bg};color:${color.fg};font-size:12px;font-weight:600;border-radius:3px;font-family:'JetBrains Mono',monospace;">${escapeHtml(vola.chip)}</span>
                </div>` : ""}
                <div style="font-size:12px;color:#7B8499;">
                  出处 · ${escapeHtml(it.source || "—")}
                  ${it.source_url ? ` · <a href="${escapeHtml(it.source_url)}" style="color:#D4A24C;text-decoration:none;">原文</a>` : ""}
                  · <a href="${escapeHtml(detailUrl)}" style="color:#D4A24C;text-decoration:none;">详细分析 →</a>
                </div>
              </td>
            </tr>`;
        })
        .join("");
      return `
        <tr>
          <td style="padding:24px 0 8px;">
            <div style="display:flex;align-items:baseline;gap:10px;">
              <span style="display:inline-block;width:4px;height:18px;background:#D4A24C;"></span>
              <span style="font-size:17px;color:#E8EAF0;font-weight:600;">${escapeHtml(g.label)}</span>
              <span style="font-size:12px;color:#7B8499;font-family:'JetBrains Mono',monospace;">${String(g.list.length).padStart(2, "0")} 条</span>
            </div>
          </td>
        </tr>
        ${itemsHtml}`;
    })
    .join("");

  const footerLinks: string[] = [];
  if (settings.include_media_library_link && domain) {
    footerLinks.push(`<a href="${domain.replace(/\/$/, "")}/media" style="color:#D4A24C;text-decoration:none;margin-right:16px;">媒体库</a>`);
  }
  if (settings.include_model_link && domain) {
    footerLinks.push(`<a href="${domain.replace(/\/$/, "")}/model" style="color:#D4A24C;text-decoration:none;margin-right:16px;">模型逻辑</a>`);
  }

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(settings.subject_prefix)}（${date}）</title>
</head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;color:#E8EAF0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0E1A;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
          <tr>
            <td style="padding:8px 0 20px;border-bottom:1px solid #1E2638;">
              <div style="font-size:12px;color:#7B8499;font-family:'JetBrains Mono',monospace;letter-spacing:0.1em;">${escapeHtml(settings.subject_prefix)}</div>
              <div style="font-size:24px;color:#E8EAF0;font-weight:600;margin-top:6px;">每日全球要闻简报 · ${date}</div>
              <div style="font-size:12px;color:#7B8499;margin-top:6px;">北京时间 ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}</div>
            </td>
          </tr>
          ${items.length === 0
            ? `<tr><td style="padding:60px 0;text-align:center;color:#7B8499;">今日暂无简报</td></tr>`
            : sectionsHtml}
          ${industryItems.length > 0
            ? `
          <tr>
            <td style="padding:28px 0 8px;">
              <div style="display:flex;align-items:baseline;gap:10px;">
                <span style="display:inline-block;width:4px;height:18px;background:#D4A24C;"></span>
                <span style="font-size:17px;color:#E8EAF0;font-weight:600;">热点产业分析</span>
                <span style="font-size:12px;color:#7B8499;font-family:'JetBrains Mono',monospace;">${String(industryItems.length).padStart(2, "0")} 个</span>
              </div>
            </td>
          </tr>
          ${buildIndustryAnalysisHtml(industryItems)}`
            : ""}
          ${footerLinks.length > 0
            ? `<tr><td style="padding:24px 0 8px;border-top:1px solid #1E2638;font-size:12px;color:#7B8499;">${footerLinks.join("")}</td></tr>`
            : ""}
          <tr>
            <td style="padding:20px 0 8px;font-size:11px;color:#7B8499;text-align:center;">
              本邮件由系统自动生成，请勿直接回复。
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailText(date: string, items: Briefing[], industryItems: IndustryAnalysis[] = []): string {
  const groups = groupBySection(items);
  const lines: string[] = [];
  lines.push(`每日全球要闻简报 · ${date}`);
  lines.push("=".repeat(32));
  lines.push("");
  if (items.length === 0) {
    lines.push("今日暂无简报");
  } else {
    for (const g of groups) {
      lines.push(`【${g.label}】 ${g.list.length} 条`);
      lines.push("-".repeat(28));
      g.list.forEach((it, i) => {
        const vola = parseVolatilityForecast(it.volatility_forecast, it.related_symbols);
        lines.push(`${i + 1}. ${it.title}`);
        lines.push(`   ${it.body}`);
        if (vola.chip) lines.push(`   ${vola.chip}`);
        lines.push(`   置信度：${CONFIDENCE_LABELS[it.confidence] ?? it.confidence} · 出处：${it.source || "—"}`);
        if (it.source_url) lines.push(`   链接：${it.source_url}`);
        lines.push("");
      });
    }
  }
  // 产业分析
  if (industryItems.length > 0) {
    lines.push("");
    lines.push(`【热点产业分析】 ${industryItems.length} 个`);
    lines.push("-".repeat(28));
    industryItems.forEach((ind, i) => {
      lines.push(`${i + 1}. ${ind.industry_name}`);
      lines.push(`   政策分析：${ind.policy_analysis}`);
      lines.push(`   产业链分析：${ind.chain_analysis}`);
      lines.push(`   产能重点：${ind.capacity_focus}`);
      lines.push(`   技术发展：${ind.tech_development}`);
      if (ind.market_outlook) lines.push(`   市场展望：${ind.market_outlook}`);
      if (ind.related_symbols?.length > 0) {
        const symbols = ind.related_symbols.map(s => `${s.name}(${s.impact === "positive" ? "+" : s.impact === "negative" ? "-" : "~"})`).join(" ");
        lines.push(`   相关标的：${symbols}`);
      }
      lines.push(`   置信度：${CONFIDENCE_LABELS[ind.confidence] ?? ind.confidence}`);
      lines.push("");
    });
  }
  return lines.join("\n");
}
