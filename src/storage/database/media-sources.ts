import { getSupabaseClient } from "@/storage/database/supabase-client";
import type { MediaSource } from "@/types/briefing";

export async function listMediaSources(): Promise<MediaSource[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("media_sources")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MediaSource[];
}

export async function getEnabledMediaSources(): Promise<MediaSource[]> {
  const all = await listMediaSources();
  return all.filter((m) => m.enabled);
}

export async function createMediaSource(
  payload: Omit<MediaSource, "id" | "created_at" | "updated_at">,
): Promise<MediaSource> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("media_sources")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as MediaSource;
}

export async function updateMediaSource(
  id: string,
  payload: Partial<Omit<MediaSource, "id" | "created_at" | "updated_at">>,
): Promise<MediaSource> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("media_sources")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MediaSource;
}

export async function deleteMediaSource(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("media_sources").delete().eq("id", id);
  if (error) throw error;
}

export async function bulkUpsertMediaSources(
  rows: Partial<MediaSource>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = getSupabaseClient();
  const payload = rows
    .filter((r) => r.name && r.url)
    .map((r) => ({
      name: r.name as string,
      url: r.url as string,
      type: r.type ?? "international",
      region: r.region ?? "global",
      enabled: r.enabled ?? true,
      remark: r.remark ?? null,
      sort_order: r.sort_order ?? 100,
    }));
  if (payload.length === 0) return 0;
  const { data, error } = await supabase
    .from("media_sources")
    .upsert(payload, { onConflict: "name,url" })
    .select();
  if (error) throw error;
  return data?.length ?? 0;
}
