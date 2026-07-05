// AI 简报生成核心逻辑 - 联网搜索 + LLM 筛选生成
import { webSearch } from "@/lib/web-search";
import { llmInvoke } from "@/lib/llm";
import { getEnabledMediaSources } from "@/storage/database/media-sources";
import { getActiveModelParam } from "@/storage/database/model-params";
import { addDays, todayDateString } from "@/lib/date";
import type { Briefing, ModelParam, MediaSource, BriefingSection, ConfidenceLevel, RelatedSymbol, IndustryAnalysisInsert } from "@/types/briefing";

export interface GeneratedItem {
  section: BriefingSection;
  sort_order: number;
  title: string;
  body: string;
  source: string;
  source_url: string | null;
  confidence: ConfidenceLevel;
  detailed_analysis: string;
  related_symbols: RelatedSymbol[];
  volatility_forecast: string;
  event_date: string | null;
}

export interface GeneratedIndustryAnalysis {
  industry_name: string;
  policy_analysis: string;
  chain_analysis: string;
  capacity_focus: string;
  tech_development: string;
  market_outlook: string | null;
  // 新增深度分析字段
  financial_report_analysis: string | null;
  competitive_landscape: string | null;
  investment_suggestion: string | null;
  risk_warning: string | null;
  key_companies: Array<{
    name: string;
    code: string;
    market_cap: string;
    revenue_growth: string;
    key_metric: string;
    position: string;
  }> | null;
  related_symbols: RelatedSymbol[];
  confidence: ConfidenceLevel;
  source: string | null;
  source_url: string | null;
}

export interface GenerateResult {
  date: string;
  items: GeneratedItem[];
  industry_analysis: GeneratedIndustryAnalysis[];
  modelVersion: number | null;
  searches: number;
  usedSources: string[];
}

export async function generateBriefingForDate(
  date: string = todayDateString(),
): Promise<GenerateResult> {
  const sources = await getEnabledMediaSources();
  const model = await getActiveModelParam();
  if (sources.length === 0) {
    throw new Error("无可用媒体源，请先在「媒体库管理」中启用至少一个媒体");
  }

  const longTermCount = model?.long_term_count ?? 2;
  const domesticCount = model?.domestic_impact_count ?? 3;
  const weeklyCount = model?.weekly_event_count ?? 5;
  const keywords = (model?.keywords ?? []).slice(0, 8);
  const topicPrefs = (model?.topic_preferences ?? []).slice(0, 6);
  const excludeWords = model?.exclude_words ?? [];

  // Run multiple searches for diversity
  const queries = buildQueries(keywords, topicPrefs, sources);
  const searchResults: { query: string; items: { title: string; url: string; snippet: string; source?: string }[] }[] = [];
  for (const q of queries.slice(0, 6)) {
    try {
      const res = await webSearch(q, 8);
      searchResults.push({ query: q, items: res.items });
    } catch (e) {
      // skip failed searches
      searchResults.push({ query: q, items: [] });
    }
  }

  // Aggregate all items and pick top candidates
  const allItems = aggregateSearchResults(searchResults);
  const filtered = filterItems(allItems, excludeWords);
  const deduped = dedupeByTitle(filtered);

  // Build prompt for LLM to select and format 10 items
  const prompt = buildSelectionPrompt({
    date,
    longTermCount,
    domesticCount,
    weeklyCount,
    candidates: deduped.slice(0, 40),
    mediaSources: sources.slice(0, 25),
    model,
  });

  const result = await llmInvoke(
    [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.4, maxTokens: 6000 },
  );

  const items = parseGeneratedItems(result, sources);
  if (items.length < 10) {
    throw new Error(`AI 仅生成 ${items.length} 条，需 10 条`);
  }

  // 生成热点产业分析
  const industryQueries = buildIndustryQueries(keywords, topicPrefs);
  const industrySearchResults: { query: string; items: { title: string; url: string; snippet: string; source?: string }[] }[] = [];
  for (const q of industryQueries.slice(0, 4)) {
    try {
      const res = await webSearch(q, 10);
      industrySearchResults.push({ query: q, items: res.items });
    } catch (e) {
      industrySearchResults.push({ query: q, items: [] });
    }
  }
  const industryAllItems = aggregateSearchResults(industrySearchResults);
  const industryFiltered = filterItems(industryAllItems, excludeWords);
  const industryDeduped = dedupeByTitle(industryFiltered);

  const industryPrompt = buildIndustryAnalysisPrompt({
    date,
    candidates: industryDeduped.slice(0, 30),
    mediaSources: sources.slice(0, 25),
  });

  const industryResult = await llmInvoke(
    [
      { role: "system", content: INDUSTRY_SYSTEM_PROMPT },
      { role: "user", content: industryPrompt },
    ],
    { temperature: 0.5, maxTokens: 4000 },
  );

  const industryAnalysis = parseGeneratedIndustryAnalysis(industryResult, sources);

  return {
    date,
    items: items.slice(0, 10),
    industry_analysis: industryAnalysis,
    modelVersion: model?.version ?? null,
    searches: searchResults.length + industrySearchResults.length,
    usedSources: sources.map((s) => s.name),
  };
}

const SYSTEM_PROMPT = `你是专业金融简报编辑，擅长从全球媒体中筛选与生成结构化投资简报。`;

function buildQueries(
  keywords: { word: string; weight: number }[],
  topics: { topic: string; weight: number }[],
  sources: MediaSource[],
): string[] {
  const queries: string[] = [];
  const highK = keywords
    .filter((k) => k.weight >= 7)
    .slice(0, 4)
    .map((k) => k.word);
  const highT = topics
    .filter((t) => t.weight >= 7)
    .slice(0, 3)
    .map((t) => t.topic);

  for (const k of highK) {
    queries.push(`${k} 最新政策 影响`);
  }
  for (const t of highT) {
    queries.push(`${t} 全球市场 影响`);
  }
  queries.push("全球重要财经新闻");
  queries.push("央行 利率决议");
  queries.push("A股 影响");
  return queries;
}

interface SearchItem {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  query: string;
}

function aggregateSearchResults(
  results: { query: string; items: { title: string; url: string; snippet: string; source?: string }[] }[],
): SearchItem[] {
  const all: SearchItem[] = [];
  for (const r of results) {
    for (const it of r.items) {
      all.push({ ...it, query: r.query });
    }
  }
  return all;
}

function filterItems(items: SearchItem[], exclude: string[]): SearchItem[] {
  if (exclude.length === 0) return items;
  return items.filter((it) => {
    const t = `${it.title} ${it.snippet}`.toLowerCase();
    for (const ex of exclude) {
      if (ex && t.includes(ex.toLowerCase())) return false;
    }
    return true;
  });
}

function dedupeByTitle(items: SearchItem[]): SearchItem[] {
  const seen = new Set<string>();
  const out: SearchItem[] = [];
  for (const it of items) {
    const k = it.title.toLowerCase().slice(0, 30);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

interface SelectionPromptInput {
  date: string;
  longTermCount: number;
  domesticCount: number;
  weeklyCount: number;
  candidates: SearchItem[];
  mediaSources: MediaSource[];
  model: ModelParam | null;
}

function buildSelectionPrompt(input: SelectionPromptInput): string {
  const today = new Date(input.date);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const todayStr = input.date;
  const nextWeekStr = nextWeek.toISOString().slice(0, 10);

  const candidateList = input.candidates
    .map(
      (c, i) =>
        `${i + 1}. [${c.source ?? "未知媒体"}] ${c.title}\n   ${c.snippet}\n   ${c.url}`,
    )
    .join("\n\n");

  const sourceList = input.mediaSources
    .map((s) => `${s.name}(${s.type}/${s.region})`)
    .join(", ");

  return `日期：${todayStr}（未来一周截止：${nextWeekStr}）

任务：从下面的"候选新闻"中筛选并改写为 ${input.longTermCount + input.domesticCount + input.weeklyCount} 条结构化要闻：
- 远期发展：${input.longTermCount} 条（宏观趋势/产业政策/科技突破）
- 国内市场直接影响：${input.domesticCount} 条（对A股/期货/期权有直接、即时影响）
- 未来一周重点可能事件：${input.weeklyCount} 条（未来一周内可能发生的重要事件）

每条要求：
1. body（正文）严格不超过 20 个汉字
2. title 简明扼要
3. confidence 必须是 high/medium/low 之一
4. detailed_analysis 用 Markdown，包含 ## 影响逻辑 / ## 受影响标的 / ## 波动区间 三个小节
5. volatility_forecast 形如"某板块 +1.5%~+2.3%"（看多）或"美元 -0.5%~-1.0%"（看空），两端的正负号必须一致；
   如果无法判断方向，输出"某板块 ±0.8%~±1.5%"（±表示双向波动），将由前端结合 related_symbols.impact 决定显示"涨/跌"
6. source 必须从以下媒体库中挑选最匹配的一个：${sourceList}
7. event_date 仅 weekly_event 类型必填（YYYY-MM-DD），其他类型填 null
8. related_symbols 数组，元素格式 {"type":"stock/future/option","name":"...","code":"...","impact":"positive/negative/neutral"}
   其中 impact 强烈建议与 volatility_forecast 的方向一致（涨 → positive；跌 → negative）

输出严格 JSON，格式：
{
  "items": [
    {
      "section": "long_term|domestic_impact|weekly_event",
      "sort_order": 1,
      "title": "...",
      "body": "不超过20汉字",
      "source": "媒体名",
      "source_url": "URL或null",
      "confidence": "high|medium|low",
      "detailed_analysis": "Markdown 文本",
      "related_symbols": [...],
      "volatility_forecast": "...",
      "event_date": "YYYY-MM-DD 或 null"
    }
  ]
}

候选新闻：
${candidateList || "（暂无候选）"}

只输出 JSON，不要任何额外说明。`;
}

function parseGeneratedItems(
  raw: string,
  sources: MediaSource[],
): GeneratedItem[] {
  let parsed: { items?: GeneratedItem[] } = {};
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return [];
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }
  const items = (parsed.items ?? []).filter(
    (i): i is GeneratedItem =>
      i && typeof i.title === "string" && typeof i.body === "string" && typeof i.section === "string",
  );
  // Validate and clamp body to 40 chars (allow a tiny buffer since 20 汉字 may be loose)
  for (const it of items) {
    if (it.body.length > 80) it.body = it.body.slice(0, 80);
    if (!it.confidence) it.confidence = "medium";
    if (!it.source) it.source = "未知媒体";
    // pick the closest source name
    const matchedSource = sources.find((s) => s.name === it.source);
    if (!matchedSource && sources.length > 0) {
      it.source = sources[0]!.name;
    }
    if (!it.related_symbols || !Array.isArray(it.related_symbols)) {
      it.related_symbols = [];
    }
    if (it.section === "weekly_event" && !it.event_date) {
      it.event_date = addDays(todayDateString(), 3);
    }
    if (it.section !== "weekly_event") {
      it.event_date = null;
    }
  }
  return items;
}

// ========== 热点产业分析 ==========

const INDUSTRY_SYSTEM_PROMPT = `你是资深产业分析师，擅长从政策、产业链、产能和技术角度深度分析热点产业，为投资决策提供参考。`;

function buildIndustryQueries(
  keywords: { word: string; weight: number }[],
  topics: { topic: string; weight: number }[],
): string[] {
  const queries: string[] = [];
  
  // 高权重关键词 → 产业深度分析
  const highK = keywords.filter((k) => k.weight >= 7).slice(0, 3).map((k) => k.word);
  const highT = topics.filter((t) => t.weight >= 7).slice(0, 2).map((t) => t.topic);
  
  for (const k of highK) {
    queries.push(`${k} 产业链深度分析 龙头企业财报`);
    queries.push(`${k} 竞争格局 产能布局 技术发展`);
    queries.push(`${k} 行业研报 投资建议 风险提示`);
  }
  for (const t of highT) {
    queries.push(`${t} 产业政策 龙头企业 财报分析`);
    queries.push(`${t} 市场规模 竞争格局 投资机会`);
  }
  
  // 通用的热点产业搜索
  queries.push("热门赛道 产业链深度分析 龙头企业");
  queries.push("新能源 人工智能 半导体 行业研报");
  queries.push("上市公司财报 营收增长 市场份额");
  
  return queries;
}

interface IndustryPromptInput {
  date: string;
  candidates: SearchItem[];
  mediaSources: MediaSource[];
}

function buildIndustryAnalysisPrompt(input: IndustryPromptInput): string {
  const candidateList = input.candidates
    .map(
      (c, i) =>
        `${i + 1}. [${c.source ?? "未知媒体"}] ${c.title}\n   ${c.snippet}\n   ${c.url}`,
    )
    .join("\n\n");

  const sourceList = input.mediaSources
    .map((s) => `${s.name}(${s.type}/${s.region})`)
    .join(", ");

  return `日期：${input.date}

任务：基于候选新闻和行业研报，生成 1-2 个热点产业的深度分析报告。要求像专业券商研报一样深入、结构化。

每个产业分析包含以下模块化内容：

【基础分析模块】
1. industry_name: 产业名称（如"新能源汽车"、"人工智能"、"半导体"等）
2. policy_analysis: 政策分析（当前相关政策、法规、补贴、监管动态，约150字）
3. chain_analysis: 产业链分析（上游原材料、中游制造、下游应用、各环节利润率，约200字）
4. capacity_focus: 产能重点（当前产能分布、龙头企业产能规划、产能利用率、供需缺口，约150字）
5. tech_development: 技术发展（最新技术突破、技术路线对比、技术壁垒、研发进展，约150字）

【深度分析模块】
6. financial_report_analysis: 龙头企业财报分析（引用具体上市公司财报数据，如营收、净利润、毛利率、同比增速等，约200字）
7. competitive_landscape: 竞争格局（市场份额分布、CR3/CR5、竞争态势、护城河分析，约150字）
8. investment_suggestion: 投资建议（当前估值水平、配置建议、催化剂、目标价区间，约100字）
9. risk_warning: 风险提示（政策风险、技术风险、市场风险、竞争风险等，约80字）
10. key_companies: 关键企业列表（3-5家龙头企业），格式：
   [{"name":"公司名","code":"股票代码","market_cap":"市值","revenue_growth":"营收增速","key_metric":"关键指标","position":"行业地位"}]
11. market_outlook: 市场展望（未来3-5年趋势、市场规模预测、投资机会，约100字，可选）
12. related_symbols: 相关标的数组，格式 {"type":"stock/future/option","name":"...","code":"...","impact":"positive/negative/neutral"}
13. confidence: high/medium/low
14. source: 来源媒体名（从 ${sourceList} 中选）

输出严格 JSON，格式：
{
  "industries": [
    {
      "industry_name": "...",
      "policy_analysis": "...",
      "chain_analysis": "...",
      "capacity_focus": "...",
      "tech_development": "...",
      "financial_report_analysis": "...",
      "competitive_landscape": "...",
      "investment_suggestion": "...",
      "risk_warning": "...",
      "key_companies": [...],
      "market_outlook": "...",
      "related_symbols": [...],
      "confidence": "high|medium|low",
      "source": "媒体名",
      "source_url": "URL或null"
    }
  ]
}

候选新闻：
${candidateList || "（暂无候选）"}

只输出 JSON，不要任何额外说明。`;
}

function parseGeneratedIndustryAnalysis(
  raw: string,
  sources: MediaSource[],
): GeneratedIndustryAnalysis[] {
  let parsed: { industries?: GeneratedIndustryAnalysis[] } = {};
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return [];
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }
  
  const industries = (parsed.industries ?? []).filter(
    (i): i is GeneratedIndustryAnalysis =>
      i && typeof i.industry_name === "string" && typeof i.policy_analysis === "string",
  );
  
  for (const it of industries) {
    if (!it.confidence) it.confidence = "medium";
    if (!it.source) it.source = "未知媒体";
    if (!it.related_symbols || !Array.isArray(it.related_symbols)) {
      it.related_symbols = [];
    }
    // 确保基础字段不为空
    if (!it.chain_analysis) it.chain_analysis = "暂无产业链分析";
    if (!it.capacity_focus) it.capacity_focus = "暂无产能重点信息";
    if (!it.tech_development) it.tech_development = "暂无技术发展信息";
    // 新增深度分析字段的默认值
    if (!it.financial_report_analysis) it.financial_report_analysis = null;
    if (!it.competitive_landscape) it.competitive_landscape = null;
    if (!it.investment_suggestion) it.investment_suggestion = null;
    if (!it.risk_warning) it.risk_warning = null;
    if (!it.key_companies || !Array.isArray(it.key_companies)) it.key_companies = null;
    if (!it.market_outlook) it.market_outlook = null;
  }
  
  return industries;
}
