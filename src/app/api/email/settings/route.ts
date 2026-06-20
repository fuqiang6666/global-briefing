import { NextRequest, NextResponse } from "next/server";
import { getEmailSettings, upsertEmailSettings } from "@/storage/database/email";

export const dynamic = "force-dynamic";

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
    const body = await request.json();
    const current = await getEmailSettings();
    const updated = await upsertEmailSettings(
      {
        enabled: body.enabled ?? false,
        recipients: body.recipients ?? [],
        cc_recipients: body.cc_recipients ?? [],
        subject_prefix: body.subject_prefix ?? "每日全球要闻简报",
        send_hour: body.send_hour ?? 8,
        send_minute: body.send_minute ?? 1,
        include_media_library_link: body.include_media_library_link ?? true,
        include_model_link: body.include_model_link ?? true,
        note: body.note ?? null,
      },
      current?.id,
    );
    return NextResponse.json({ success: true, item: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
