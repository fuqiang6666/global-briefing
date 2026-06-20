import { NextRequest, NextResponse } from "next/server";
import { getEmailSettings, upsertEmailSettings } from "@/storage/database/email";
import { clearSmtpCache } from "@/lib/email-client";

export const dynamic = "force-dynamic";

const SMTP_KEYS = [
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_secure",
  "smtp_from_name",
  "smtp_from_email",
] as const;

export async function GET() {
  try {
    const item = await getEmailSettings();
    return NextResponse.json({ success: true, item });
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
    const body = (await request.json()) as Record<string, unknown>;
    const current = await getEmailSettings();

    const update: Record<string, unknown> = {
      enabled: body.enabled ?? false,
      recipients: body.recipients ?? [],
      cc_recipients: body.cc_recipients ?? [],
      subject_prefix: body.subject_prefix ?? "每日全球要闻简报",
      send_hour: body.send_hour ?? 8,
      send_minute: body.send_minute ?? 1,
      include_media_library_link: body.include_media_library_link ?? true,
      include_model_link: body.include_model_link ?? true,
      note: body.note ?? null,
    };

    for (const key of SMTP_KEYS) {
      if (key in body) {
        update[key] = body[key];
      }
    }

    const updated = await upsertEmailSettings(
      update as never,
      current?.id,
    );
    clearSmtpCache();
    return NextResponse.json({ success: true, item: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
