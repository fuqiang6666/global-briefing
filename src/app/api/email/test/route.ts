import { NextResponse } from "next/server";
import { testSmtpConnection } from "@/lib/email-client";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await testSmtpConnection();
    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: `SMTP 连接成功（${result.host}:${result.port}，来源：${result.source}）`,
        ...result,
      });
    }
    return NextResponse.json(
      { success: false, error: result.error ?? "连接失败" },
      { status: 500 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
