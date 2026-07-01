/**
 * 热点产业分析 CRUD 操作
 */
import { getSupabaseClient } from "./supabase-client";
import type { IndustryAnalysis, IndustryAnalysisInsert, IndustryAnalysisUpdate } from "@/types/briefing";

const supabase = getSupabaseClient();
const TABLE = "industry_analysis";

/**
 * 获取指定日期的产业分析列表
 */
export async function listIndustryAnalysisByDate(date: string): Promise<IndustryAnalysis[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("analysis_date", date)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(`[industry_analysis] list by date error:`, error.message);
    throw error;
  }

  return (data as IndustryAnalysis[]) ?? [];
}

/**
 * 获取所有产业分析（带筛选）
 */
export async function listIndustryAnalysis(filter?: {
  startDate?: string;
  endDate?: string;
  industryName?: string;
  limit?: number;
}): Promise<IndustryAnalysis[]> {
  let query = supabase.from(TABLE).select("*").order("analysis_date", { ascending: false });

  if (filter?.startDate) {
    query = query.gte("analysis_date", filter.startDate);
  }
  if (filter?.endDate) {
    query = query.lte("analysis_date", filter.endDate);
  }
  if (filter?.industryName) {
    query = query.ilike("industry_name", `%${filter.industryName}%`);
  }
  if (filter?.limit) {
    query = query.limit(filter.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[industry_analysis] list error:`, error.message);
    throw error;
  }

  return (data as IndustryAnalysis[]) ?? [];
}

/**
 * 获取单个产业分析
 */
export async function getIndustryAnalysis(id: string): Promise<IndustryAnalysis | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error(`[industry_analysis] get error:`, error.message);
    throw error;
  }

  return data as IndustryAnalysis;
}

/**
 * 创建产业分析
 */
export async function createIndustryAnalysis(item: IndustryAnalysisInsert): Promise<IndustryAnalysis> {
  const { data, error } = await supabase.from(TABLE).insert(item).select().single();

  if (error) {
    console.error(`[industry_analysis] create error:`, error.message);
    throw error;
  }

  return data as IndustryAnalysis;
}

/**
 * 批量创建产业分析
 */
export async function createIndustryAnalysisBatch(items: IndustryAnalysisInsert[]): Promise<IndustryAnalysis[]> {
  const { data, error } = await supabase.from(TABLE).insert(items).select();

  if (error) {
    console.error(`[industry_analysis] batch create error:`, error.message);
    throw error;
  }

  return (data as IndustryAnalysis[]) ?? [];
}

/**
 * 更新产业分析
 */
export async function updateIndustryAnalysis(id: string, item: IndustryAnalysisUpdate): Promise<IndustryAnalysis> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...item, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`[industry_analysis] update error:`, error.message);
    throw error;
  }

  return data as IndustryAnalysis;
}

/**
 * 删除产业分析
 */
export async function deleteIndustryAnalysis(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) {
    console.error(`[industry_analysis] delete error:`, error.message);
    throw error;
  }
}

/**
 * 删除指定日期的所有产业分析
 */
export async function deleteIndustryAnalysisByDate(date: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("analysis_date", date);

  if (error) {
    console.error(`[industry_analysis] delete by date error:`, error.message);
    throw error;
  }
}