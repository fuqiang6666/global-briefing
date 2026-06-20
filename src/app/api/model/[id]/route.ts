import { NextRequest, NextResponse } from "next/server";
import {
  updateModelParam,
  deleteModelParam,
  setActiveModelParam,
  getModelParamById,
  getNextModelVersion,
  createModelParam,
} from "@/storage/database/model-params";
import { llmInvoke } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const item = await getModelParamById(id);
    return NextResponse.json({ success: true, item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateModelParam(id, body);
    return NextResponse.json({ success: true, item: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteModelParam(id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

// AI auto-optimize endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action: string = body.action ?? "optimize";

    if (action === "activate") {
      const updated = await setActiveModelParam(id);
      return NextResponse.json({ success: true, item: updated });
    }

    if (action === "optimize") {
      const current = await getModelParamById(id);
      if (!current) {
        return NextResponse.json(
          { success: false, error: "模型参数不存在" },
          { status: 404 },
        );
      }
      const prompt = `你是金融简报筛选模型优化专家。基于以下当前模型参数和近期反馈，给出一份更优的关键词权重、主题偏好、排除词建议。

当前模型：
- 版本号：v${current.version}
- 关键词：${JSON.stringify(current.keywords)}
- 主题偏好：${JSON.stringify(current.topic_preferences)}
- 排除词：${JSON.stringify(current.exclude_words)}
- 远期/国内/一周配比：${current.long_term_count}/${current.domestic_impact_count}/${current.weekly_event_count}
- 时间窗口：${current.time_window_hours}小时

用户反馈：${body.feedback ?? "无"}

要求：
1. 保留权威性、剔除娱乐/八卦等无效词
2. 增强对A股、港股、美股、期货、期权有直接影响的关键词
3. 输出严格 JSON 格式，包含 keywords、topic_preferences、exclude_words 三个数组
4. 每个关键词带 weight (1-10)，主题带 weight (1-10)

只输出 JSON，不要其他说明。`;
      const result = await llmInvoke([
        { role: "system", content: "你是金融简报筛选模型优化专家。" },
        { role: "user", content: prompt },
      ], { temperature: 0.3, maxTokens: 2000 });

      let parsed: {
        keywords?: { word: string; weight: number }[];
        topic_preferences?: { topic: string; weight: number }[];
        exclude_words?: string[];
      } = {};
      try {
        // try to extract JSON from response
        const match = result.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match?.[0] ?? "{}");
      } catch {
        return NextResponse.json(
          { success: false, error: "AI 返回结果解析失败", raw: result },
          { status: 500 },
        );
      }

      // Create new version with merged params
      const newVersion = await getNextModelVersion();
      const newItem = await createModelParam({
        version: newVersion,
        is_active: false,
        keywords: parsed.keywords ?? current.keywords,
        topic_preferences: parsed.topic_preferences ?? current.topic_preferences,
        exclude_words: parsed.exclude_words ?? current.exclude_words,
        long_term_count: current.long_term_count,
        domestic_impact_count: current.domestic_impact_count,
        weekly_event_count: current.weekly_event_count,
        min_auth_level: current.min_auth_level,
        time_window_hours: current.time_window_hours,
        note: `AI 自动优化，基于 v${current.version}${body.feedback ? `，反馈：${body.feedback}` : ""}`,
        created_by: "ai",
      });
      return NextResponse.json({ success: true, item: newItem, raw: result });
    }

    return NextResponse.json(
      { success: false, error: "未知 action" },
      { status: 400 },
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
