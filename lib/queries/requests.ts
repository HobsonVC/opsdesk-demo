import { REQUEST_STATUSES, REQUEST_TYPES, TEAMS } from "@/lib/requests";

export type RequestFilters = { q?: string; status?: string; type?: string; team?: string; range?: string };

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

type Filterable = {
  eq(column: string, value: unknown): Filterable;
  ilike(column: string, pattern: string): Filterable;
  gte(column: string, value: unknown): Filterable;
};

export function pickFilters(sp: Record<string, string | string[] | undefined>): RequestFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return { q: one("q"), status: one("status"), type: one("type"), team: one("team"), range: one("range") };
}

export function hasFilters(f: RequestFilters) {
  return Boolean(f.q?.trim() || f.status || f.type || f.team || f.range);
}

export function applyRequestFilters<T extends Filterable>(query: T, f: RequestFilters, isManager: boolean, now: number): T {
  let q: Filterable = query;
  const term = f.q?.trim();
  if (term) {
    const ref = term.match(/^(?:req-?)?(\d{3,})$/i);
    q = ref ? q.eq("ref", Number(ref[1])) : q.ilike("title", `%${term.replace(/[%_]/g, "")}%`);
  }
  if (f.status && (REQUEST_STATUSES as readonly string[]).includes(f.status)) q = q.eq("status", f.status);
  if (f.type && (REQUEST_TYPES as readonly string[]).includes(f.type)) q = q.eq("type", f.type);
  if (isManager && f.team && (TEAMS as readonly string[]).includes(f.team)) q = q.eq("team", f.team);
  if (f.range && RANGE_DAYS[f.range]) q = q.gte("created_at", new Date(now - RANGE_DAYS[f.range] * 86_400_000).toISOString());
  return q as T;
}
