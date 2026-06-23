import { NextRequest, NextResponse } from "next/server";
import { runScheduledTask } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET ?? "global-briefing-default-secret";

/**
 * 外部 cron 触发入口（也作为手动触发入口）
 * POST /api/cron/daily
 * body: { secret, date?, forceGenerate?, forceSendEmail? }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // 允许空 body
  }

  const secret = typeof body.secret === "string" ? body.secret : "";
  if (secret !== CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: "鉴权失败：secret 不正确" },
      { status: 401 }
    );
  }

  const date = typeof body.date === "string" ? body.date : undefined;
  const forceGenerate = body.forceGenerate === true;
  const forceSendEmail = body.forceSendEmail === true;

  const result = await runScheduledTask({
    date,
    forceGenerate,
    forceSendEmail,
  });

  return NextResponse.json(result, { status: 200 });
}
