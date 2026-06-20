import { getSupabaseClient } from "@/storage/database/supabase-client";
import type { ModelParam } from "@/types/briefing";

export async function listModelParams(): Promise<ModelParam[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("model_params")
    .select("*")
    .order("version", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ModelParam[];
}

export async function getActiveModelParam(): Promise<ModelParam | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("model_params")
    .select("*")
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ModelParam | null) ?? null;
}

export async function getModelParamById(id: string): Promise<ModelParam | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("model_params")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ModelParam | null) ?? null;
}

export async function createModelParam(
  payload: Omit<ModelParam, "id" | "created_at">,
): Promise<ModelParam> {
  const supabase = getSupabaseClient();
  // If marked active, deactivate others first
  if (payload.is_active) {
    await supabase.from("model_params").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  }
  const { data, error } = await supabase
    .from("model_params")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as ModelParam;
}

export async function updateModelParam(
  id: string,
  payload: Partial<Omit<ModelParam, "id" | "created_at">>,
): Promise<ModelParam> {
  const supabase = getSupabaseClient();
  if (payload.is_active) {
    await supabase.from("model_params").update({ is_active: false }).neq("id", id);
  }
  const { data, error } = await supabase
    .from("model_params")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ModelParam;
}

export async function setActiveModelParam(id: string): Promise<ModelParam> {
  const supabase = getSupabaseClient();
  await supabase.from("model_params").update({ is_active: false }).neq("id", id);
  const { data, error } = await supabase
    .from("model_params")
    .update({ is_active: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ModelParam;
}

export async function deleteModelParam(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: target } = await supabase
    .from("model_params")
    .select("is_active")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("model_params").delete().eq("id", id);
  if (error) throw error;
  // If we deleted the active one, activate the newest remaining
  if (target?.is_active) {
    const { data: newest } = await supabase
      .from("model_params")
      .select("id")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (newest?.id) {
      await supabase.from("model_params").update({ is_active: true }).eq("id", newest.id);
    }
  }
}

export async function getNextModelVersion(): Promise<number> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("model_params")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return ((data?.version as number | undefined) ?? 0) + 1;
}
