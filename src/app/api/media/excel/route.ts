import { NextRequest, NextResponse } from "next/server";
import { bulkUpsertMediaSources } from "@/storage/database/media-sources";
import { jsonToXlsxBuffer } from "@/lib/excel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = [
      {
        name: "示例：财经媒体",
        url: "https://www.example.com",
        type: "financial",
        region: "cn",
        enabled: true,
        sort_order: 100,
        remark: "示例条目，可删除",
      },
    ];
    const buf = jsonToXlsxBuffer(rows, "media_sources");
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="media_sources_template.xlsx"`,
      },
    });
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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "未上传文件" },
        { status: 400 },
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const { xlsxBufferToJson } = await import("@/lib/excel");
    const rows = xlsxBufferToJson(buffer);
    const count = await bulkUpsertMediaSources(rows as never);
    return NextResponse.json({ success: true, count });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
