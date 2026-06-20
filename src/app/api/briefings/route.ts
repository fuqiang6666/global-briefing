import { NextRequest, NextResponse } from "next/server";
import {
  listBriefingsByDate,
  listBriefingDates,
  bulkUpsertBriefings,
  type CreateBriefingInput,
} from "@/storage/database/briefings";
import { getActiveModelParam, listModelParams } from "@/storage/database/model-params";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const allDates = await listBriefingDates();

    if (date) {
      const items = await listBriefingsByDate(date);
      const activeModel = await getActiveModelParam();
      return NextResponse.json({
        success: true,
        date,
        items,
        model: activeModel,
      });
    }

    const paramsList = await listModelParams();
    return NextResponse.json({
      success: true,
      dates: allDates,
      models: paramsList,
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
    const body = (await request.json()) as {
      items?: Partial<CreateBriefingInput>[];
    };
    if (!body?.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { success: false, error: "缺少 items 数组" },
        { status: 400 },
      );
    }
    const count = await bulkUpsertBriefings(body.items);
    return NextResponse.json({ success: true, count });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

