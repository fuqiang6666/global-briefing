import { getSupabaseClient } from "@/storage/database/supabase-client";
import type { Briefing, BriefingSection, RelatedSymbol, ConfidenceLevel } from "@/types/briefing";

export async function listBriefingsByDate(date: string): Promise<Briefing[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("briefings")
    .select("*")
    .eq("briefing_date", date)
    .order("section", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Briefing[];
}

export async function listBriefingDates(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("briefings")
    .select("briefing_date")
    .order("briefing_date", { ascending: false });
  if (error) throw error;
  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.briefing_date) set.add(row.briefing_date as string);
  }
  return Array.from(set);
}

export async function getBriefingById(id: string): Promise<Briefing | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("briefings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Briefing | null) ?? null;
}

export interface CreateBriefingInput {
  briefing_date: string;
  section: BriefingSection;
  sort_order: number;
  title: string;
  body: string;
  source: string;
  source_url?: string | null;
  confidence: ConfidenceLevel;
  detailed_analysis?: string | null;
  related_symbols?: RelatedSymbol[];
  volatility_forecast?: string | null;
  event_date?: string | null;
}

export async function createBriefing(payload: CreateBriefingInput): Promise<Briefing> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("briefings")
    .insert({
      briefing_date: payload.briefing_date,
      section: payload.section,
      sort_order: payload.sort_order,
      title: payload.title,
      body: payload.body,
      source: payload.source,
      source_url: payload.source_url ?? null,
      confidence: payload.confidence,
      detailed_analysis: payload.detailed_analysis ?? null,
      related_symbols: payload.related_symbols ?? [],
      volatility_forecast: payload.volatility_forecast ?? null,
      event_date: payload.event_date ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Briefing;
}

export async function updateBriefing(
  id: string,
  payload: Partial<CreateBriefingInput>,
): Promise<Briefing> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("briefings")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Briefing;
}

export async function deleteBriefing(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("briefings").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteBriefingsByDate(date: string): Promise<number> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("briefings")
    .delete()
    .eq("briefing_date", date)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function bulkUpsertBriefings(
  rows: Partial<CreateBriefingInput>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = getSupabaseClient();
  const payload = rows
    .filter(
      (r): r is CreateBriefingInput & { id?: string } =>
        !!r.briefing_date && !!r.section && !!r.title && !!r.body && !!r.source && !!r.confidence,
    )
    .map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      briefing_date: r.briefing_date,
      section: r.section,
      sort_order: r.sort_order ?? 0,
      title: r.title,
      body: r.body,
      source: r.source,
      source_url: r.source_url ?? null,
      confidence: r.confidence,
      detailed_analysis: r.detailed_analysis ?? null,
      related_symbols: r.related_symbols ?? [],
      volatility_forecast: r.volatility_forecast ?? null,
      event_date: r.event_date ?? null,
    }));
  if (payload.length === 0) return 0;
  const { data, error } = await supabase
    .from("briefings")
    .upsert(payload)
    .select();
  if (error) throw error;
  return data?.length ?? 0;
}
