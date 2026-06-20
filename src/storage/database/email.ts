import { getSupabaseClient } from "@/storage/database/supabase-client";
import type { EmailSettings, EmailSendLog } from "@/types/briefing";

export async function getEmailSettings(): Promise<EmailSettings | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("email_settings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as EmailSettings | null) ?? null;
}

export async function upsertEmailSettings(
  payload: Omit<EmailSettings, "id" | "created_at" | "updated_at" | "last_sent_at">,
  id?: string,
): Promise<EmailSettings> {
  const supabase = getSupabaseClient();
  if (id) {
    const { data, error } = await supabase
      .from("email_settings")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as EmailSettings;
  }
  const { data, error } = await supabase
    .from("email_settings")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as EmailSettings;
}

export async function updateEmailLastSent(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from("email_settings")
    .update({ last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function listEmailSendLogs(limit = 20): Promise<EmailSendLog[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("email_send_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as EmailSendLog[];
}

export async function createEmailSendLog(
  payload: Omit<EmailSendLog, "id" | "created_at">,
): Promise<EmailSendLog> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("email_send_log")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as EmailSendLog;
}
