import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  generated_at: string;
  kpis: {
    total_cur: number;
    total_prev: number;
    approval_rate_cur: number | null;
    approval_rate_prev: number | null;
    turnaround_cur: number | null;
    turnaround_prev: number | null;
    pending_now: number;
    pending_over_24h: number;
  };
  weekly: { start: string; end: string; total: number; approved: number }[];
  by_team: { team: string; total: number; approved: number; rejected: number; pending: number }[];
  status: { approved: number; rejected: number; pending: number };
  recent: {
    id: string;
    action: string;
    note: string | null;
    created_at: string;
    actor: string;
    request_id: string;
    ref: number;
    title: string;
    type: string;
  }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_stats");
  if (error) throw new Error(error.message);
  return data as unknown as DashboardStats;
}
