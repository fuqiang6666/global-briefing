import { NextRequest, NextResponse } from "next/server";
import {
  listMediaSources,
  createMediaSource,
} from "@/storage/database/media-sources";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listMediaSources();
    return NextResponse.json({ success: true, items });
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
    const created = await createMediaSource({
      name: body.name,
      url: body.url,
      type: body.type ?? "international",
      region: body.region ?? "global",
      enabled: body.enabled ?? true,
      remark: body.remark ?? null,
      sort_order: body.sort_order ?? 100,
    });
    return NextResponse.json({ success: true, item: created });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
