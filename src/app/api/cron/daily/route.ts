// Cron trigger endpoint - to be called by external scheduler
// Verifies a shared secret header to prevent unauthorized triggers
import { NextRequest, NextResponse } from "next/server";
import { generateBriefingForDate } from "@/lib/generate-briefing";
import { createBriefing, deleteBriefingsByDate } from "@/storage/database/briefings";
import { sendEmail } from "@/lib/email";
import { todayDateString, getBeijingHourMinute, formatBeijingTime } from "@/lib/date";
import { getEmailSettings, createEmailSendLog, updateEmailLastSent } from "@/storage/database/email";
import { SECTION_LABELS } from "@/types/briefing";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface CronRequest {
  date?: string;
  forceGenerate?: boolean;
  forceSendEmail?: boolean;
  secret?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CronRequest;
    const expectedSecret = process.env.CRON_SECRET || "global-briefing-default-secret";
    if (body.secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: "无效的 secret" },
        { status: 401 },
      );
    }
    const date = body.date || todayDateString();
    const { hour, minute } = getBeijingHourMinute();
    const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    // Step 1: Generate briefing
    let result: Awaited<ReturnType<typeof generateBriefingForDate>> | null = null;
    try {
      result = await generateBriefingForDate(date);
      await deleteBriefingsByDate(date);
      for (const item of result.items) {
        await createBriefing({
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
      }
    } catch (genErr: unknown) {
      const errMsg = genErr instanceof Error ? genErr.message : String(genErr);
      return NextResponse.json(
        {
          success: false,
          stage: "generate",
          error: errMsg,
          time: formatBeijingTime(),
        },
        { status: 500 },
      );
    }

    // Step 2: Send email if enabled
    const settings = await getEmailSettings();
    let emailStatus: "sent" | "skipped" | "failed" = "skipped";
    let emailError: string | null = null;
    if (
      settings?.enabled &&
      settings.recipients.length > 0 &&
      (body.forceSendEmail ||
        (settings.send_hour === hour && settings.send_minute === minute))
    ) {
      try {
        const subject = `${settings.subject_prefix}（${date}）`;
        // Inline import to avoid circular at type level
        const { listBriefingsByDate } = await import("@/storage/database/briefings");
        const items = await listBriefingsByDate(date);
        const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || "";
        const html = buildEmailHtml(date, items, settings, domain);
        const text = buildEmailText(date, items);
        await sendEmail({
          to: settings.recipients,
          cc: settings.cc_recipients,
          subject,
          html,
          text,
        });
        await createEmailSendLog({
          send_date: todayDateString(),
          recipients: settings.recipients,
          subject,
          status: "success",
          error_message: null,
          briefing_date: date,
          item_count: items.length,
        });
        if (settings.id) await updateEmailLastSent(settings.id);
        emailStatus = "sent";
      } catch (sendErr: unknown) {
        const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);
        emailStatus = "failed";
        emailError = msg;
        await createEmailSendLog({
          send_date: todayDateString(),
          recipients: settings?.recipients ?? [],
          subject: `${settings?.subject_prefix ?? "每日全球要闻简报"}（${date}）`,
          status: "failed",
          error_message: msg,
          briefing_date: date,
          item_count: 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      date,
      time: timeStr,
      generatedCount: result?.items.length ?? 0,
      modelVersion: result?.modelVersion ?? null,
      emailStatus,
      emailError,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

function buildEmailHtml(
  date: string,
  items: import("@/types/briefing").Briefing[],
  settings: import("@/types/briefing").EmailSettings,
  domain: string,
): string {
  const linksHtml = `
    <div style="margin-top:24px;padding:16px;background:#f4f6fa;border-radius:8px;font-size:13px;color:#475569;">
      <div>🔗 <a href="${domain}/media" style="color:#2563eb;text-decoration:none;">管理媒体库</a> · <a href="${domain}/model" style="color:#2563eb;text-decoration:none;">调整模型逻辑</a> · <a href="${domain}/?date=${date}" style="color:#2563eb;text-decoration:none;">查看完整简报</a></div>
    </div>`;
  const sections: Record<string, import("@/types/briefing").Briefing[]> = {
    long_term: [],
    domestic_impact: [],
    weekly_event: [],
  };
  for (const item of items) {
    if (sections[item.section]) sections[item.section].push(item);
  }
  let body = "";
  for (const key of ["long_term", "domestic_impact", "weekly_event"] as const) {
    const arr = sections[key];
    if (!arr || arr.length === 0) continue;
    body += `<h2 style="font-size:16px;color:#0f172a;margin:24px 0 12px;padding:6px 12px;background:#fef3c7;border-left:3px solid #f59e0b;">${SECTION_LABELS[key]}</h2>`;
    for (const item of arr) {
      const detailLink = `${domain}/?date=${date}&item=${item.id}`;
      body += `<div style="margin-bottom:12px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
        <div style="font-size:14px;color:#0f172a;margin-bottom:6px;">${escapeHtml(item.title)}</div>
        <div style="font-size:13px;color:#475569;margin-bottom:8px;">${escapeHtml(item.body)}</div>
        <div style="font-size:12px;color:#64748b;">
          <span style="background:#e0f2fe;padding:1px 6px;border-radius:4px;margin-right:6px;">📰 ${escapeHtml(item.source)}</span>
          <span style="background:${confidenceColor(item.confidence)};padding:1px 6px;border-radius:4px;margin-right:6px;">置信度：${item.confidence === "high" ? "高" : item.confidence === "medium" ? "中" : "低"}</span>
          <a href="${detailLink}" style="color:#2563eb;text-decoration:none;">详细分析 →</a>
        </div>
      </div>`;
    }
  }
  return `<!doctype html><html><head><meta charset="utf-8"></head>
    <body style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <h1 style="font-size:22px;color:#0f172a;margin:0 0 4px;">每日全球要闻简报</h1>
        <div style="font-size:13px;color:#64748b;margin-bottom:16px;">${date} · 共 ${items.length} 条要闻</div>
        ${body}
        ${settings.include_media_library_link || settings.include_model_link ? linksHtml : ""}
      </div>
    </body></html>`;
}

function buildEmailText(
  date: string,
  items: import("@/types/briefing").Briefing[],
): string {
  let text = `每日全球要闻简报（${date}）\n共 ${items.length} 条\n\n`;
  const sections: Record<string, import("@/types/briefing").Briefing[]> = {
    long_term: [],
    domestic_impact: [],
    weekly_event: [],
  };
  for (const item of items) {
    if (sections[item.section]) sections[item.section].push(item);
  }
  for (const key of ["long_term", "domestic_impact", "weekly_event"] as const) {
    const arr = sections[key];
    if (!arr || arr.length === 0) continue;
    text += `\n== ${SECTION_LABELS[key]} ==\n`;
    for (const item of arr) {
      text += `• ${item.title}\n  ${item.body}\n  [${item.source}] [置信度：${item.confidence}]\n\n`;
    }
  }
  return text;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function confidenceColor(c: string): string {
  if (c === "high") return "#dcfce7";
  if (c === "medium") return "#fef3c7";
  return "#fee2e2";
}
