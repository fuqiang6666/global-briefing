// 后台定时任务调度器
// - 复用 /api/cron/daily 的核心生成+发送逻辑
// - 每分钟检查一次邮件设置中的发送时间
// - 通过 `last_sent_at` 防止同日重复发送
import { generateBriefingForDate } from "@/lib/generate-briefing";
import { sendEmail } from "@/lib/email";
import { buildEmailHtml, buildEmailText } from "@/lib/email-template";
import {
  createBriefing,
  deleteBriefingsByDate,
  listBriefingsByDate,
} from "@/storage/database/briefings";
import {
  getEmailSettings,
  createEmailSendLog,
  updateEmailLastSent,
} from "@/storage/database/email";
import {
  todayInBeijing,
  getBeijingHour,
  getBeijingMinute,
  getBeijingDateString,
  getBeijingTimeString,
} from "@/lib/date";
import type { Briefing, EmailSettings } from "@/types/briefing";
import { SECTION_LABELS } from "@/types/briefing";

export interface ScheduledRunResult {
  triggered: boolean;
  reason: string;
  date: string;
  time: string;
  generatedCount?: number;
  emailStatus?: "sent" | "skipped" | "failed";
  emailError?: string | null;
  logId?: string | null;
}

export interface RunOptions {
  date?: string;
  /** 强制生成（即使已有简报） */
  forceGenerate?: boolean;
  /** 强制发送邮件（忽略时间检查） */
  forceSendEmail?: boolean;
  /** 跳过生成，只发送邮件 */
  skipGenerate?: boolean;
  /** 收件人覆盖（不读取设置） */
  overrideRecipients?: string[];
}

let schedulerHandle: NodeJS.Timeout | null = null;
let lastTickAt: string | null = null;
let lastRunAt: string | null = null;
let lastRunResult: ScheduledRunResult | null = null;

/** 取下次发送时间（北京时间） */
export function computeNextRun(
  settings: EmailSettings,
  now: Date = new Date(),
): string {
  const dateStr = getBeijingDateString(now);
  const timeStr = getBeijingTimeString(now);
  const parts = { date: dateStr, time: timeStr, hour: getBeijingHour(now), minute: getBeijingMinute(now) };
  const today = parts.date;
  const hStr = String(parts.hour).padStart(2, "0"); const mStr = String(parts.minute).padStart(2, "0");
  void hStr;
  void mStr;
  const targetH = settings.send_hour;
  const targetM = settings.send_minute;
  const nowMinutes = getBeijingHour(now) * 60 + getBeijingMinute(now);
  const targetMinutes = targetH * 60 + targetM;
  if (nowMinutes < targetMinutes) {
    return `${today} ${String(targetH).padStart(2, "0")}:${String(targetM).padStart(2, "0")}`;
  }
  // 已过 → 明天
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  const t2 = { date: getBeijingDateString(tomorrow), time: getBeijingTimeString(tomorrow) };
  return `${t2.date} ${String(targetH).padStart(2, "0")}:${String(targetM).padStart(2, "0")}`;
}

/** 核心：生成 + 发送。供 /api/cron/daily 与后台调度器复用。 */
export async function runScheduledTask(
  options: RunOptions = {},
): Promise<ScheduledRunResult> {
  const date = options.date || todayInBeijing();
  const hour = getBeijingHour();
  const minute = getBeijingMinute();
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  // Step 1: 生成简报
  let generatedCount = 0;
  let modelVersion: number | null = null;
  if (!options.skipGenerate) {
    try {
      const result = await generateBriefingForDate(date);
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
      generatedCount = result.items.length;
      modelVersion = result.modelVersion ?? null;
    } catch (genErr: unknown) {
      const errMsg = genErr instanceof Error ? genErr.message : String(genErr);
      return {
        triggered: false,
        reason: `生成失败：${errMsg}`,
        date,
        time: timeStr,
      };
    }
  }

  // Step 2: 邮件发送
  const settings = await getEmailSettings();
  if (!settings) {
    return {
      triggered: true,
      reason: "已生成简报，邮件未配置",
      date,
      time: timeStr,
      generatedCount,
      emailStatus: "skipped",
    };
  }

  const recipients = options.overrideRecipients ?? settings.recipients;
  const isTimeMatch =
    settings.send_hour === hour && settings.send_minute === minute;
  const shouldSend =
    options.forceSendEmail ||
    (settings.enabled && recipients.length > 0 && isTimeMatch);

  if (!shouldSend) {
    return {
      triggered: true,
      reason: settings.enabled
        ? recipients.length === 0
          ? "未配置收件人"
          : `未到发送时间（当前 ${timeStr}，计划 ${String(settings.send_hour).padStart(2, "0")}:${String(settings.send_minute).padStart(2, "0")}）`
        : "邮件总开关未开启",
      date,
      time: timeStr,
      generatedCount,
      emailStatus: "skipped",
    };
  }

  const subject = `${settings.subject_prefix}（${date}）`;
  let items: Briefing[] = [];
  try {
    items = await listBriefingsByDate(date);
  } catch {
    items = [];
  }
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || "";
  const html = buildEmailHtml(date, items, settings, domain);
  const text = buildEmailText(date, items);

  try {
    await sendEmail({
      to: recipients,
      cc: settings.cc_recipients,
      subject,
      html,
      text,
    });
    const log = await createEmailSendLog({
      send_date: todayInBeijing(),
      recipients,
      subject,
      status: "success",
      error_message: null,
      briefing_date: date,
      item_count: items.length,
    });
    if (settings.id) await updateEmailLastSent(settings.id);
    return {
      triggered: true,
      reason: "发送成功",
      date,
      time: timeStr,
      generatedCount,
      emailStatus: "sent",
      logId: log.id,
    };
  } catch (sendErr: unknown) {
    const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);
    await createEmailSendLog({
      send_date: todayInBeijing(),
      recipients,
      subject,
      status: "failed",
      error_message: msg,
      briefing_date: date,
      item_count: items.length,
    });
    return {
      triggered: true,
      reason: `发送失败：${msg}`,
      date,
      time: timeStr,
      generatedCount,
      emailStatus: "failed",
      emailError: msg,
    };
  }
}

/** 判断当前是否应该触发（同一天 + 同分钟 + 未发过） */
function shouldTriggerNow(
  settings: EmailSettings | null,
  now: Date,
): { should: boolean; reason: string } {
  if (!settings) return { should: false, reason: "邮件未配置" };
  if (!settings.enabled)
    return { should: false, reason: "邮件总开关未开启" };
  if (settings.recipients.length === 0)
    return { should: false, reason: "未配置收件人" };
  const hour = getBeijingHour(now);
  const minute = getBeijingMinute(now);
  if (settings.send_hour !== hour || settings.send_minute !== minute) {
    return { should: false, reason: "未到发送时间" };
  }
  // 防重复：last_sent_at 是同一日期就跳过
  if (settings.last_sent_at) {
    const lastDate = getBeijingDateString(new Date(settings.last_sent_at));
    const today = getBeijingDateString(now);
    if (lastDate === today) {
      return { should: false, reason: "今日已发送过" };
    }
  }
  return { should: true, reason: "ok" };
}

/** 启动后台调度器 */
export function startScheduler(intervalMs = 60_000): void {
  if (schedulerHandle) {
    console.log("[scheduler] already started");
    return;
  }
  console.log(
    `[scheduler] started, tick every ${intervalMs / 1000}s, current BJ time ${getBeijingTimeString()}`,
  );
  // 启动后等 5 秒再第一次 tick，避免 server 还没完全 ready
  setTimeout(() => void tick(), 5_000);
  schedulerHandle = setInterval(() => void tick(), intervalMs);
}

export function stopScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
    console.log("[scheduler] stopped");
  }
}

export function getSchedulerStatus(): {
  running: boolean;
  lastTickAt: string | null;
  lastRunAt: string | null;
  lastRunResult: ScheduledRunResult | null;
} {
  return {
    running: schedulerHandle !== null,
    lastTickAt,
    lastRunAt,
    lastRunResult,
  };
}

async function tick(): Promise<void> {
  lastTickAt = getBeijingTimeString();
  try {
    const settings = await getEmailSettings();
    const decision = shouldTriggerNow(settings, new Date());
    if (!decision.should) {
      // 每小时第 1 分钟打印一次心跳，便于排错
      if (new Date().getUTCMinutes() % 60 === 1) {
        console.log(
          `[scheduler] tick ${lastTickAt} · skip (${decision.reason})`,
        );
      }
      return;
    }
    console.log(`[scheduler] tick ${lastTickAt} · triggering daily send`);
    lastRunAt = getBeijingTimeString();
    const result = await runScheduledTask({ forceSendEmail: true });
    lastRunResult = result;
    console.log(
      `[scheduler] run finished · reason=${result.reason} · emailStatus=${result.emailStatus ?? "-"}`,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[scheduler] tick error: ${msg}`);
  }
}

// 兼容旧版（部分代码可能引用了 SECTION_LABELS）
export { SECTION_LABELS };
