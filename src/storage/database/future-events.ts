import { getSupabaseClient } from "@/storage/database/supabase-client";
import type { FutureEvent, ConfidenceLevel, RelatedSymbol } from "@/types/briefing";

export async function listFutureEvents(): Promise<FutureEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("future_events")
    .select("*")
    .order("event_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FutureEvent[];
}

export async function listFutureEventsByDateRange(
  fromDate: string,
  toDate: string,
): Promise<FutureEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("future_events")
    .select("*")
    .gte("event_date", fromDate)
    .lte("event_date", toDate)
    .order("event_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FutureEvent[];
}

export interface CreateFutureEventInput {
  event_date: string;
  title: string;
  description: string;
  category: string;
  confidence: ConfidenceLevel;
  potential_impact_symbols?: RelatedSymbol[];
  volatility_forecast?: string | null;
  source?: string | null;
  source_url?: string | null;
  detailed_analysis?: string | null;
  status?: "pending" | "confirmed" | "completed" | "cancelled";
}

export async function createFutureEvent(
  payload: CreateFutureEventInput,
): Promise<FutureEvent> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("future_events")
    .insert({
      event_date: payload.event_date,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      confidence: payload.confidence,
      potential_impact_symbols: payload.potential_impact_symbols ?? [],
      volatility_forecast: payload.volatility_forecast ?? null,
      source: payload.source ?? null,
      source_url: payload.source_url ?? null,
      detailed_analysis: payload.detailed_analysis ?? null,
      status: payload.status ?? "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data as FutureEvent;
}

export async function updateFutureEvent(
  id: string,
  payload: Partial<CreateFutureEventInput>,
): Promise<FutureEvent> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("future_events")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as FutureEvent;
}

export async function deleteFutureEvent(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("future_events").delete().eq("id", id);
  if (error) throw error;
}

export async function bulkUpsertFutureEvents(
  rows: Partial<CreateFutureEventInput>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = getSupabaseClient();
  const payload = rows
    .filter(
      (r): r is CreateFutureEventInput & { id?: string } =>
        !!r.event_date && !!r.title && !!r.description && !!r.category && !!r.confidence,
    )
    .map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      event_date: r.event_date,
      title: r.title,
      description: r.description,
      category: r.category,
      confidence: r.confidence,
      potential_impact_symbols: r.potential_impact_symbols ?? [],
      volatility_forecast: r.volatility_forecast ?? null,
      source: r.source ?? null,
      source_url: r.source_url ?? null,
      detailed_analysis: r.detailed_analysis ?? null,
      status: r.status ?? "pending",
    }));
  if (payload.length === 0) return 0;
  const { data, error } = await supabase
    .from("future_events")
    .upsert(payload)
    .select();
  if (error) throw error;
  return data?.length ?? 0;
}
